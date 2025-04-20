#!/usr/bin/env bash

# This script mounts S3 buckets/prefixes onto the local filesystem using fuse and
#   goofys. It also attempts to create a sym link to the mounted data if the instance
#   is an EMR or SageMaker instance so that it can be easily accessed by Jupyter notebooks.
#
# /usr/local/s3-mounts.json should contain S3 study data metadata of the form
#  [{
#   "id": "STUDY_ID",
#   "bucket": "BUCKET_NAME",
#   "prefix": "BUCKET_PREFIX",
#   "studyType": "s3|ftp",
#   "ftpHost": "FTP_HOST",
#   "ftpPort": "FTP_PORT",
#   "ftpUser": "FTP_USER",
#   "ftpPass": "FTP_PASSWORD",
#   "ftpPath": "FTP_PATH"
# }, ...]
CONFIG="/usr/local/etc/s3-mounts.json"
MOUNT_DIR="${HOME}/studies"
AWS_CONFIG_DIR="${HOME}/.aws"

# Exit if CONFIG doesn't exist or is 0 bytes
[ ! -s "$CONFIG" ] && exit 0

# Define a function to determine what type of environment this is (EMR, SageMaker, RStudio, or EC2 Linux)
env_type() {
    if [ -d "/usr/share/aws/emr" ]
    then
        printf "emr"
    elif [ -d "/home/ec2-user/SageMaker" ]
    then
        printf "sagemaker"
    elif [ -d "/var/log/rstudio-server" ]
    then
        printf "rstudio"
    else
        printf "ec2-linux"
    fi
}

# Add roleArn for a study to credentials file if not present already
append_role_to_credentials() {
    study_id=$1
    role_arn=$2
    credentials_file=$AWS_CONFIG_DIR/credentials
    if ! grep -q "\[$study_id\]" $AWS_CONFIG_DIR/credentials &>/dev/null
    then
      # append role for this study since it doesn't already exist in the file
      echo "[$study_id]" >> $credentials_file
      echo "role_arn = $role_arn" >> $credentials_file
      echo "credential_source = Ec2InstanceMetadata" >> $credentials_file
      echo "" >> $credentials_file
    fi
}

# Use STS regional endpoint instead of global one. This allows external studies to connect with local interface endpoint
# if it exists. Refer https://docs.aws.amazon.com/sdkref/latest/guide/setting-global-sts_regional_endpoints.html
token=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"`
region=`curl http://169.254.169.254/latest/meta-data/placement/availability-zone/ -H "X-aws-ec2-metadata-token: $token" | sed 's/.$//'`
export AWS_STS_REGIONAL_ENDPOINTS=regional
export AWS_DEFAULT_REGION=$region
export AWS_SDK_LOAD_CONFIG=1

# Mount S3 buckets
mounts="$(cat "$CONFIG")"
num_mounts=$(printf "%s" "$mounts" | jq ". | length" -)
for ((study_idx=0; study_idx<$num_mounts; study_idx++))
do
    # Parse bucket/key info
    study_id="$(printf "%s" "$mounts" | jq -r ".[$study_idx].id" -)"
    study_type="$(printf "%s" "$mounts" | jq -r ".[$study_idx].studyType" -)"
    
    # Create study directory
    study_dir="${MOUNT_DIR}/${study_id}"
    mkdir -p "$study_dir"
    
    if [ "$study_type" == "ftp" ]; then
        # Handle FTP study type
        ftp_host="$(printf "%s" "$mounts" | jq -r ".[$study_idx].ftpHost" -)"
        ftp_port="$(printf "%s" "$mounts" | jq -r ".[$study_idx].ftpPort" -)"
        ftp_user="$(printf "%s" "$mounts" | jq -r ".[$study_idx].ftpUser" -)"
        ftp_pass="$(printf "%s" "$mounts" | jq -r ".[$study_idx].ftpPass" -)"
        ftp_path="$(printf "%s" "$mounts" | jq -r ".[$study_idx].ftpPath" -)"
        
        # Check if already mounted
        ps -U "$LOGNAME" -o "command" | grep -q "curlftpfs .* ${study_dir}$"
        if [ $? -ne 0 ]; then
            printf 'Mounting FTP study "%s" at "%s" using host "%s"\n' "$study_id" "$study_dir" "$ftp_host"
            
            # Store credentials in a secure file
            echo "$ftp_user:$ftp_pass" > /tmp/ftp_creds_${study_id}
            chmod 600 /tmp/ftp_creds_${study_id}
            
            # Mount FTP
            curlftpfs -o user=$ftp_user:$ftp_pass ftp://$ftp_host:$ftp_port/$ftp_path "$study_dir"
            
            # Clean up credentials file
            rm /tmp/ftp_creds_${study_id}
        fi
    else
        # Handle S3 study type (original logic)
        s3_bucket="$(printf "%s" "$mounts" | jq -r ".[$study_idx].bucket" -)"
        s3_prefix="$(printf "%s" "$mounts" | jq -r ".[$study_idx].prefix" -)"
        s3_role_arn="$(printf "%s" "$mounts" | jq -r ".[$study_idx].roleArn" -)"
        kms_arn="$(printf "%s" "$mounts" | jq -r ".[$study_idx].kmsArn" -)"

        # Mount S3 location if not already mounted
        ps -U "$LOGNAME" -o "command" | egrep -q "mount-s3 .* ${study_dir}$"
        if [ $? -ne 0 ]
        then
            if [ "$s3_role_arn" == "null" ]
            then
                printf 'Mounting internal study "%s" at "%s"\n' "$study_id" "$study_dir"
                #goofys --region $region --acl "bucket-owner-full-control" "${s3_bucket}:${s3_prefix}" "$study_dir"
                mkdir /tmp/"${s3_bucket}"
                mount-s3 --no-sign-request --cache /tmp/"${s3_bucket}" --prefix "${s3_prefix}" "${s3_bucket}" "$study_dir"
            else
                bucket_region="$(printf "%s" "$mounts" | jq -r ".[$study_idx].region" -)"
                # BYOB studies have a region specified, but in case it isn't use the default region
                if [[ $bucket_region == "null" ]]; then
                  printf 'Bucket region is not specified. Defaulting to "%s" for mounting \n' "$region"
                  bucket_region=$region
                fi;

                # make .aws dir if it doesn't already exist and add credentials
                mkdir -p $AWS_CONFIG_DIR
                append_role_to_credentials $study_id $s3_role_arn
                mkdir /tmp/"${s3_bucket}"
                if [ "$kms_arn" == "null" ]
                then
                    printf 'Mounting external study "%s" at "%s" using role "%s" and region "%s" \n' "$study_id" "$study_dir" \
                    "$s3_role_arn" "$bucket_region"
                    # goofys --region $bucket_region --profile $study_id --acl "bucket-owner-full-control" \
                    # "${s3_bucket}:${s3_prefix}" "$study_dir"
                    mount-s3 --region $bucket_region --profile $study_id --cache /tmp/"${s3_bucket}" --prefix "${s3_prefix}" "${s3_bucket}" "$study_dir"
                else
                    printf 'Mounting external study "%s" at "%s" using role "%s", kms arn "%s" and region "%s" \n' "$study_id" "$study_dir" \
                    "$s3_role_arn" "$kms_arn" "$bucket_region"
                    # goofys --region $bucket_region --profile $study_id --sse-kms $kms_arn --acl "bucket-owner-full-control" \
                    # "${s3_bucket}:${s3_prefix}" "$study_dir"
                    mount-s3 --region $bucket_region --profile $study_id --sse-kms-key-id $kms_arn --cache /tmp/"${s3_bucket}" --prefix "${s3_prefix}" "${s3_bucket}" "$study_dir"
                fi
            fi
        fi
    fi
done

# Define where the Jupyter notebook (if any) should be running
notebook_dir=""
case "$(env_type)" in
    "emr")
        notebook_dir="/opt/hail-on-AWS-spot-instances/notebook"
        ;;
    "sagemaker")
        notebook_dir="/home/ec2-user/SageMaker"
        ;;
esac

# Add a link to the mount in the notebook directory.
# (The user gets easy access, but it won't check the bucket into a git repo.)
# Only create a link if Jupyter is running, there are studies mounted, and the link
# doesn't already exist.
if [ -n "$notebook_dir" -a $num_mounts -ne 0 ]
then
    symlink_name="$notebook_dir/studies"
    [ ! -L "$symlink_name" ] && sudo ln -s "$MOUNT_DIR" "$symlink_name"
fi

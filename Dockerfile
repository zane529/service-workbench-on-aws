FROM 763104351884.dkr.ecr.ap-southeast-1.amazonaws.com/sagemaker-notebook-instance:notebook-al2-v3

USER root

# Install system dependencies
RUN yum update -y && yum install -y \
    git \
    wget \
    curl \
    unzip \
    && yum clean all

# Create conda environment
RUN conda create -y -n geo python=3.9 && \
    conda activate geo

# Install conda packages
RUN conda install -y -c conda-forge \
    geoai \
    && conda clean -afy

# Install Python packages
RUN pip install --no-cache-dir \
    ipyleaflet \
    cogeo_mosaic \
    localtileserver \
    rasterio \
    matplotlib \
    folium \
    geopandas \
    pycrs \
    osmnx \
    leafmap \
    segment-geospatial

# Install GDAL from custom wheel
RUN pip install --no-cache-dir --find-links=https://girder.github.io/large_image_wheels GDAL

# Install packages from GitHub
RUN pip install --no-cache-dir \
    git+https://github.com/opengeos/leafmap \
    git+https://github.com/opengeos/segment-geospatial

# Install Jupyter extensions
RUN jupyter labextension install @jupyter-widgets/jupyterlab-manager @lumino/widgets jupyter-leaflet

# Create custom kernel
RUN python -m ipykernel install --name "python-geo" --user

# Switch back to non-root user
USER ec2-user

# Set working directory
WORKDIR /home/ec2-user/SageMaker

# Set environment variables
ENV CONDA_DEFAULT_ENV=geo
ENV PATH /opt/conda/envs/geo/bin:$PATH 
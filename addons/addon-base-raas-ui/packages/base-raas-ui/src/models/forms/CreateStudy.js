/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License").
 *  You may not use this file except in compliance with the License.
 *  A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 *  or in the "license" file accompanying this file. This file is distributed
 *  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 *  express or implied. See the License for the specific language governing
 *  permissions and limitations under the License.
 */

import { createForm } from '../../helpers/form';
import { categories } from '../studies/categories';

const createStudyFields = {
  // General fields
  id: {
    label: 'ID',
    placeholder: 'A unique ID used to reference the study',
    extra: {
      explain: 'Must be less than 100 characters long and only contain alphanumeric characters, "-", or "_"',
    },
    rules: ['required', 'string', 'between:1,100', 'regex:/^[A-Za-z0-9-_]+$/'],
  },
  studyType: {
    label: 'Study type',
    placeholder: 'Select the type of study',
    rules: ['required', 'string'],
    extra: {
      options: [
        { value: 's3', label: 'S3' },
        { value: 'ftp', label: 'FTP' },
      ],
    },
  },
  categoryId: {
    label: '', // not shown because extra.showHeader = false
    extra: {
      explain:
        'If you choose "My Study", only you can access it. If you choose "Organization Study", you get to decide who can access it.',
      yesLabel: 'My Study',
      noLabel: 'Organization Study',
      yesValue: categories.myStudies.id,
      noValue: categories.organization.id,
      showHeader: false,
    },
    rules: ['required'],
  },
  ftpHost: {
    label: 'FTP Host',
    placeholder: 'The hostname of the FTP server',
    rules: ['string', 'max:255'],
  },
  ftpPort: {
    label: 'FTP Port',
    placeholder: 'The port of the FTP server',
    rules: ['string', 'max:10'],
  },
  ftpUser: {
    label: 'FTP Username',
    placeholder: 'The username for FTP authentication',
    rules: ['string', 'max:255'],
  },
  ftpPass: {
    label: 'FTP Password',
    placeholder: 'The password for FTP authentication',
    rules: ['string', 'max:255'],
  },
  ftpPath: {
    label: 'FTP Path',
    placeholder: 'The path on the FTP server',
    rules: ['string', 'max:1024'],
  },
  name: {
    label: 'Name',
    placeholder: 'A name for the study',
    rules: ['string', 'max:2048'],
  },
  description: {
    label: 'Description',
    placeholder: 'A description of the study',
    rules: ['string', 'max:8192'],
  },
  projectId: {
    label: 'Project ID',
    placeholder: 'The project ID associated with this study',
    rules: ['required', 'string', 'min:1', 'max:100'],
  },
};

const getCreateStudyForm = () => {
  return createForm(createStudyFields);
};

export { getCreateStudyForm }; // eslint-disable-line import/prefer-default-export

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

import React from 'react';
import { inject, observer } from 'mobx-react';
import { decorate, observable, action, runInAction } from 'mobx';
import { Button, Header, Modal, Segment, Dropdown as SemanticDropdown } from 'semantic-ui-react';
import { displayError } from '@amzn/base-ui/dist/helpers/notification';
import Dropdown from '@amzn/base-ui/dist/parts/helpers/fields/DropDown';
import Form from '@amzn/base-ui/dist/parts/helpers/fields/Form';
import Input from '@amzn/base-ui/dist/parts/helpers/fields/Input';
import TextArea from '@amzn/base-ui/dist/parts/helpers/fields/TextArea';
import YesNo from '@amzn/base-ui/dist/parts/helpers/fields/YesNo';

import { getCreateStudyForm } from '../../models/forms/CreateStudy';
import { getCategoryById } from '../../models/studies/categories';

// expected props
// - userStore (via injection)
// - studiesStoresMap (via injection)
class CreateStudy extends React.Component {
  constructor(props) {
    super(props);
    runInAction(() => {
      this.cleanModal();
      this.form = getCreateStudyForm();
      this.studyType = 's3'; // Default study type
      
      // Remove studyType from form validation since we're handling it separately
      if (this.form.$('studyType')) {
        this.form.del('studyType');
      }
    });
  }

  getStudiesStore(categoryId) {
    return this.props.studiesStoresMap[categoryId];
  }

  cleanModal = () => {
    runInAction(() => {
      this.modalOpen = false;
    });
  };

  handleFormCancel = form => {
    form.clear();
    this.cleanModal();
  };

  handleFormError = (_form, _errors) => {};

  handleStudyTypeChange = (e, { value }) => {
    runInAction(() => {
      this.studyType = value;
    });
  };

  handleFormSubmission = async form => {
    try {
      const studyValues = form.values();
      const categoryId = studyValues.categoryId; // Type here is the category id
      const categoryName = (getCategoryById(categoryId) || {}).name;
      const studiesStore = this.getStudiesStore(categoryId);

      delete studyValues.categoryId;
      
      // Make sure studyType is included in the submission
      studyValues.studyType = this.studyType;
      
      // Validate studyType is not empty
      if (!studyValues.studyType) {
        form.$('studyType').invalidate('The Study type field is required.');
        return;
      }

      // Create study, clear form, and close modal
      await studiesStore.createStudy({ ...studyValues, category: categoryName }); // TODO the backend should really accept category id not the category name
      form.clear();
      this.cleanModal();
    } catch (error) {
      displayError(error);
    }
  };

  render() {
    return (
      <Modal closeIcon trigger={this.renderTrigger()} open={this.modalOpen} onClose={this.cleanModal}>
        <div className="mt2">
          <Header as="h3" icon textAlign="center" className="mt3" color="grey">
            Create Study
          </Header>
          <div className="mx3">{this.renderCreateStudyForm()}</div>
        </div>
      </Modal>
    );
  }

  renderTrigger() {
    return (
      <Button
        floated="right"
        color="blue"
        onClick={action(() => {
          this.modalOpen = true;
        })}
      >
        Create Study
      </Button>
    );
  }

  renderCreateStudyForm() {
    const form = this.form;
    const projectIds = this.props.userStore.projectIdDropdown;
    const studyTypeOptions = [
      { key: 's3', text: 'S3', value: 's3' },
      { key: 'ftp', text: 'FTP', value: 'ftp' },
    ];

    return (
      <Segment clearing className="p3 mb3">
        <Form form={form} onCancel={this.handleFormCancel} onSuccess={this.handleFormSubmission}>
          {({ processing, /* onSubmit, */ onCancel }) => (
            <>
              <Input field={form.$('id')} />
              <div className="field mb4">
                <label>Study type</label>
                <SemanticDropdown 
                  options={studyTypeOptions}
                  fluid 
                  selection 
                  value={this.studyType}
                  onChange={this.handleStudyTypeChange}
                  placeholder="Select the type of study"
                  className="field"
                />
              </div>
              <YesNo field={form.$('categoryId')} />
              
              {this.studyType === 'ftp' && (
                <>
                  <Input field={form.$('ftpHost')} />
                  <Input field={form.$('ftpPort')} defaultValue="21" />
                  <Input field={form.$('ftpUser')} />
                  <Input field={form.$('ftpPass')} type="password" />
                  <Input field={form.$('ftpPath')} />
                </>
              )}
              
              <Input field={form.$('name')} />
              <TextArea field={form.$('description')} />
              <Dropdown field={form.$('projectId')} options={projectIds} fluid selection />

              <Button className="ml2" floated="right" color="blue" icon disabled={processing} type="submit">
                Create Study
              </Button>
              <Button floated="right" disabled={processing} onClick={onCancel}>
                Cancel
              </Button>
            </>
          )}
        </Form>
      </Segment>
    );
  }
}

decorate(CreateStudy, {
  form: observable,
  modalOpen: observable,
  studyType: observable,
  getStudiesStore: observable,
  cleanModal: action,
  handleFormSubmission: action,
  handleStudyTypeChange: action,
});

export default inject('userStore', 'studiesStoresMap')(observer(CreateStudy));

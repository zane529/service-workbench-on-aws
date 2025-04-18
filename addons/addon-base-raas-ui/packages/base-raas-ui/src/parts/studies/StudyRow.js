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
import { decorate, action, computed, runInAction, observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import { Header, Checkbox, Segment, Accordion, Icon, Popup, Label, Table } from 'semantic-ui-react';
import c from 'classnames';
import { disableStudyUploadByResearcher } from '../../helpers/settings';

import StudyFilesTable from './StudyFilesTable';
import StudyPermissionsTable from './StudyPermissionsTable';
import UploadStudyFiles from './UploadStudyFiles';

// expected props
// - study (via props)
// - isSelectable (via props)
// - filesSelection (via injection)
class StudyRow extends React.Component {
  constructor(props) {
    super(props);
    runInAction(() => {
      this.filesExpanded = false;
      this.permissionsExpanded = false;
      this.ftpInfoExpanded = false;
    });
  }

  get getUserRole() {
    return this.props.userRole;
  }

  get study() {
    return this.props.study;
  }

  get isSelectable() {
    return this.props.isSelectable && this.study.state.canSelect;
  }

  handleFileSelection = study => {
    const selection = this.props.filesSelection;
    if (selection.hasFile(study.id)) {
      selection.deleteFile(study.id);
    } else {
      const { id, name, description } = study;
      // TODO: actually do different statuses?
      selection.setFile({ id, name, description, accessStatus: 'approved' });
    }
  };

  handleFilesExpanded = () => {
    this.filesExpanded = !this.filesExpanded;
  };

  handlePermissionsExpanded = () => {
    this.permissionsExpanded = !this.permissionsExpanded;
  };

  handleFtpInfoExpanded = () => {
    this.ftpInfoExpanded = !this.ftpInfoExpanded;
  };

  render() {
    const isSelectable = this.isSelectable; // Internal and external guests can't select studies
    const study = this.study;
    const selection = this.props.filesSelection;
    const isSelected = selection.hasFile(study.id);
    const attrs = {};
    const onClickAttr = {};

    if (isSelected) attrs.color = 'blue';
    if (isSelectable) onClickAttr.onClick = () => this.handleFileSelection(study);

    return (
      <Segment clearing padded raised className="mb3" {...attrs}>
        <div data-testid="study-card" className="flex">
          <div className="mr2" {...onClickAttr}>
            {isSelectable && <Checkbox checked={isSelected} style={{ marginTop: '17px' }} />}
          </div>
          <div className="flex-auto mb1">
            {this.renderStatus(study.state)}
            {this.renderHeader(study)}
            {this.renderDescription(study)}
            {this.renderFilesAccordion(study)}
            {this.renderFtpInfoAccordion(study)}
            {this.renderPermissionsAccordion(study)}
          </div>
        </div>
      </Segment>
    );
  }

  renderHeader(study) {
    // Disable the upload files button for the researcher. This feature would be enable based on
    // the flag "disableStudyUploadByResearcher" is set to true.
    const disableResearcherAccess = this.getUserRole === 'researcher' && disableStudyUploadByResearcher === true;

    const isSelectable = this.isSelectable; // Internal and external guests can't select studies
    const onClickAttr = {};

    if (isSelectable) onClickAttr.onClick = () => this.handleFileSelection(study);

    return (
      <div>
        <Header as="h3" color="blue" className={c('mt2', isSelectable ? 'cursor-pointer' : '')} {...onClickAttr}>
          {study.uploadLocationEnabled && study.canUpload && !disableResearcherAccess && study.studyType !== 'ftp' && (
            <UploadStudyFiles studyId={study.id} />
          )}
          {study.name}
          <Header.Subheader>
            <span className="pt1 fs-8 color-grey">{study.id}</span>
            {study.projectId && <span className="fs-8 color-grey"> &middot; {study.projectId}</span>}
            {study.studyType && <span className="fs-8 color-grey"> &middot; Type: {study.studyType}</span>}
          </Header.Subheader>
        </Header>
      </div>
    );
  }

  renderDescription(study) {
    return <div>{study.description}</div>;
  }

  renderStatus(state) {
    // Do not show a label if it is default/reachable
    if (state && (state.key === 'default' || state.key === 'reachable')) return null;

    return (
      <div style={{ cursor: 'default' }}>
        <Popup
          trigger={
            <Label attached="top left" size="mini" color={state.color}>
              {state.spinner && <Icon name="spinner" loading />}
              {state.display}
            </Label>
          }
        >
          {state.tip}
        </Popup>
      </div>
    );
  }

  renderFilesAccordion(study) {
    if (study.isOpenDataStudy) return null;
    if (!study.uploadLocationEnabled) return null;
    if (study.studyType === 'ftp') return null; // Don't show files accordion for FTP studies
    const expanded = this.filesExpanded;

    return (
      <Accordion className="mt2">
        <Accordion.Title active={expanded} index={0} onClick={this.handleFilesExpanded}>
          <Icon name="dropdown" />
          <b>Files</b>
        </Accordion.Title>
        <Accordion.Content active={expanded}>
          {expanded && study.uploadLocationEnabled && (
            <div className="mb2">
              <StudyFilesTable study={study} />
            </div>
          )}
        </Accordion.Content>
      </Accordion>
    );
  }

  renderFtpInfoAccordion(study) {
    if (study.studyType !== 'ftp') return null;
    const expanded = this.ftpInfoExpanded;

    return (
      <Accordion className="mt2">
        <Accordion.Title active={expanded} index={0} onClick={this.handleFtpInfoExpanded}>
          <Icon name="dropdown" />
          <b>FTP Information</b>
        </Accordion.Title>
        <Accordion.Content active={expanded}>
          {expanded && (
            <div className="mb2">
              <Table striped compact>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell width={3}>Property</Table.HeaderCell>
                    <Table.HeaderCell>Value</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  <Table.Row>
                    <Table.Cell><Icon name="server" /> Host</Table.Cell>
                    <Table.Cell>{study.ftpHost}</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell><Icon name="plug" /> Port</Table.Cell>
                    <Table.Cell>{study.ftpPort || '21'}</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell><Icon name="user" /> Username</Table.Cell>
                    <Table.Cell>{study.ftpUser}</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell><Icon name="lock" /> Password</Table.Cell>
                    <Table.Cell>{study.ftpPass}</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell><Icon name="folder" /> Path</Table.Cell>
                    <Table.Cell>{study.ftpPath}</Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table>
            </div>
          )}
        </Accordion.Content>
      </Accordion>
    );
  }

  renderPermissionsAccordion(study) {
    if (!study.isOrganizationStudy) return null;
    const expanded = this.permissionsExpanded;

    return (
      <Accordion className="mt0">
        <Accordion.Title active={expanded} index={0} onClick={this.handlePermissionsExpanded}>
          <Icon name="dropdown" />
          <b>Permissions</b>
        </Accordion.Title>
        <Accordion.Content active={expanded}>{expanded && <StudyPermissionsTable study={study} />}</Accordion.Content>
      </Accordion>
    );
  }
}

decorate(StudyRow, {
  handleFileSelection: action,
  handleFilesExpanded: action,
  handlePermissionsExpanded: action,
  handleFtpInfoExpanded: action,
  study: computed,
  filesExpanded: observable,
  permissionsExpanded: observable,
  ftpInfoExpanded: observable,
  isSelectable: computed,
});

export default inject('filesSelection')(observer(StudyRow));

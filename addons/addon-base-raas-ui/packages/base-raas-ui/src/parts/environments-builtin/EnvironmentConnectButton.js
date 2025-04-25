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
import { observer, inject } from 'mobx-react';
import { action, computed, decorate } from 'mobx';

class EnvironmentConnectButton extends React.Component {
  getUrl = async environment => {
    const { AuthorizedUrl } = await environment.getEnvironmentUrl(this.user);
    return AuthorizedUrl;
  };

  handleConnectClick = async event => {
    event.preventDefault();
    event.stopPropagation();
    const newTab = window.open('about:blank', '_blank');

    const environment = this.props.environment;

    const url = await this.getUrl(environment);
    
    // 如果是 SageMaker 环境，我们需要先加载原始 URL 进行认证，然后重定向到 JupyterLab
    if (environment.instanceInfo && environment.instanceInfo.type === 'sagemaker') {
      // 创建一个 HTML 页面，该页面会先加载原始 URL 进行认证，然后自动重定向到 JupyterLab
      const redirectHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Redirecting to JupyterLab...</title>
          <script>
            // 首先打开原始 URL 进行认证
            const originalUrl = "${url}";
            // 然后在页面加载完成后重定向到 JupyterLab
            window.onload = function() {
              // 等待短暂时间确保认证完成
              setTimeout(function() {
                window.location.href = originalUrl.replace('/tree', '/lab');
              }, 100);
            };
            window.location.href = originalUrl;
          </script>
        </head>
        <body>
          <p>Redirecting to JupyterLab...</p>
        </body>
        </html>
      `;
      
      // 将 HTML 写入新标签页
      newTab.document.write(redirectHtml);
      newTab.document.close();
    } else {
      // 对于非 SageMaker 环境，直接使用原始 URL
      newTab.location = url;
    }
    
    environment.setFetchingUrl(false);
  };

  render() {
    const { as: As, userStore, user, environment, ...props } = this.props;
    return <As onClick={this.handleConnectClick} {...props} />;
  }

  get user() {
    return this.props.user || this.props.userStore.user;
  }
}
// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(EnvironmentConnectButton, {
  user: computed,
  handleConnectClick: action,
  getUrl: action,
});

export default inject('userStore')(observer(EnvironmentConnectButton));

import React from 'react';
import { FormattedMessage } from 'react-intl';

export default class MenuContacts extends React.PureComponent {
  render() {
    return (
      <div>
        <a href="#" onClick={(e) => {e.preventDefault(); this.props.onNewTopic();}}><i className="material-icons">chat</i></a>
        &nbsp;
        <a href="#" onClick={(e) => {e.preventDefault(); this.props.onSettings();}}><i className="material-icons">settings</i></a>
        {this.props.onLogout &&
          <FormattedMessage id="button_logout" defaultMessage="Logout" description="Button [Logout]">
            {label => <a href="#" title={label} aria-label={label}
              onClick={event => { event.preventDefault(); this.props.onLogout(); }}>
              <i className="material-icons" aria-hidden="true">exit_to_app</i>
            </a>}
          </FormattedMessage>}
      </div>
    );
  }
};


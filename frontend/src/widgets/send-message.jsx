// Send message form.
import React, { Suspense } from 'react';
import { SmallEmoji, SMALL_EMOJIS } from './small-emoji.jsx';
import { FormattedMessage, defineMessages, injectIntl } from 'react-intl';
import { Drafty } from 'tinode-sdk';

// Lazy-loading AudioRecorder because it's quite large due to
// a dependency on webm-duration-fix.
const AudioRecorder = React.lazy(_ => import('./audio-recorder.jsx'));

import { KEYPRESS_DELAY } from '../config.js';
import { filePasted } from '../lib/blob-helpers.js';
import { replyFormatter } from '../lib/formatters.js';

const messages = defineMessages({
  messaging_disabled: {
    id: 'messaging_disabled_prompt',
    defaultMessage: 'Messaging disabled',
    description: 'Prompt in SendMessage in read-only topic'
  },
  type_new_message: {
    id: 'new_message_prompt',
    defaultMessage: 'New message',
    description: 'Prompt in send message field'
  },
  add_image_caption: {
    id: 'image_caption_prompt',
    defaultMessage: 'Image caption',
    description: 'Prompt in SendMessage for attached image'
  },
  file_attachment_too_large: {
    id: 'file_attachment_too_large',
    defaultMessage: 'The file size {size} exceeds the {limit} limit.',
    description: 'Error message when attachment is too large'
  },
  cannot_initiate_upload: {
    id: 'cannot_initiate_file_upload',
    defaultMessage: 'Cannot initiate file upload.',
    description: 'Generic error messagewhen attachment fails'
  },
  icon_title_record_voice: {
    id: 'icon_title_record_voice',
    defaultMessage: 'Record voice message',
    description: 'Icon tool tip for recording a voice message'
  },
  icon_title_attach_file: {
    id: 'icon_title_attach_file',
    defaultMessage: 'Attach file',
    description: 'Icon tool tip for attaching a file'
  },
  icon_title_add_image: {
    id: 'icon_title_add_image',
    defaultMessage: 'Add image',
    description: 'Icon tool tip for attaching an image'
  },
  icon_title_send: {
    id: 'icon_title_send',
    defaultMessage: 'Send message',
    description: 'Icon tool tip for sending a message'
  },
});

class SendMessage extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      quote: null,
      message: props.initMessage || this.readDraft(props),
      audioRec: false,
      audioAvailable: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    };

    // Timestamp when the previous key press was sent to the server.
    this.keypressTimestamp = 0;

    this.handlePasteEvent = this.handlePasteEvent.bind(this);
    this.handleAttachImage = this.handleAttachImage.bind(this);
    this.handleAttachFile = this.handleAttachFile.bind(this);
    this.handleAttachAudio = this.handleAttachAudio.bind(this);
    this.handleSend = this.handleSend.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleMessageTyping = this.handleMessageTyping.bind(this);
    this.handleDropAttach = this.handleDropAttach.bind(this);

    this.handleQuoteClick = this.handleQuoteClick.bind(this);

    this.formatReply = this.formatReply.bind(this);
  }

  handleEmojiOutsidePress = event => {
    if (this.state.emojiPicker && !this.emojiPickerAnchor?.contains(event.target)) {
      this.setState({emojiPicker: false});
    }
  };

  componentDidMount() {
    document.addEventListener('pointerdown', this.handleEmojiOutsidePress, true);
    if (this.messageEditArea) {
      this.messageEditArea.addEventListener('paste', this.handlePasteEvent, false);
      if (window.getComputedStyle(this.messageEditArea).getPropertyValue('transition-property') == 'all') {
        // Set focus on desktop, but not on mobile: focus causes soft keyboard to pop up.
        this.messageEditArea.focus();
      }
    }

    this.setState({quote: this.formatReply()});
  }

  componentWillUnmount() {
    document.removeEventListener('pointerdown', this.handleEmojiOutsidePress, true);
    if (this.messageEditArea) {
      this.messageEditArea.removeEventListener('paste', this.handlePasteEvent, false);
    }
  }

  componentDidUpdate(prevProps) {
    if (this.messageEditArea) {
      if (window.getComputedStyle(this.messageEditArea).getPropertyValue('transition-property') == 'all') {
        // Set focus on desktop, but not on mobile: focus causes soft keyboard to pop up.
        this.messageEditArea.focus();
      }

      // Adjust height of the message area for the amount of text.
      this.messageEditArea.style.height = '0px';
      this.messageEditArea.style.height = this.messageEditArea.scrollHeight + 'px';
    }

    if (prevProps.topicName !== this.props.topicName || prevProps.draftUserId !== this.props.draftUserId) {
      this.setState({message: this.props.initMessage || this.readDraft(this.props), audioRec: false, quote: null, emojiPicker: false});
    } else if (prevProps.initMessage != this.props.initMessage) {
      const msg = this.props.initMessage || this.readDraft(this.props);
      this.setState({message: msg}, _ => {
        // If there is text, scroll to bottom and set caret to the end.
        this.messageEditArea.scrollTop = this.messageEditArea.scrollHeight;
        this.messageEditArea.setSelectionRange(msg.length, msg.length);
      });
    }
    if (prevProps.reply != this.props.reply) {
      this.setState({quote: this.formatReply()});
    }
  }

  formatReply() {
    return this.props.reply ?
      Drafty.format(this.props.reply.content, replyFormatter, {
        formatMessage: this.props.intl.formatMessage.bind(this.props.intl),
        authorizeURL: this.props.tinode.authorizeURL.bind(this.props.tinode)
      }) : null;
  }

  handlePasteEvent(e) {
    if (this.props.disabled) {
      return;
    }
    // FIXME: handle large files too.
    if (filePasted(e,
      file => { this.props.onAttachImage(file); },
      file => { this.props.onAttachFile(file); },
      this.props.onError)) {

      // If a file was pasted, don't paste base64 data into input field.
      e.preventDefault();
    }
  }

  handleAttachImage(e) {
    if (e.target.files && e.target.files.length > 0) {
      this.props.onAttachImage(e.target.files[0]);
    }
    // Clear the value so the same file can be uploaded again.
    e.target.value = '';
  }

  handleAttachFile(e) {
    if (e.target.files && e.target.files.length > 0) {
      this.props.onAttachFile(e.target.files[0]);
    }
    // Clear the value so the same file can be uploaded again.
    e.target.value = '';
  }

  handleDropAttach(files) {
    if (files && files.length > 0) {
      this.props.onAttachFile(files[0]);
    }
  }

  handleAttachAudio(url, preview, duration) {
    this.setState({audioRec: false});
    this.props.onAttachAudio(url, preview, duration);
  }

  draftKey({draftUserId, topicName}) {
    return draftUserId && topicName ? 'tinode:draft:' + draftUserId + ':' + topicName : null;
  }

  readDraft(props) {
    const key = this.draftKey(props);
    return key ? localStorage.getItem(key) || '' : '';
  }

  saveDraft(message) {
    const key = this.draftKey(this.props);
    if (!key || this.props.initMessage || this.props.noInput) {
      return;
    }
    if (message) {
      localStorage.setItem(key, message);
    } else {
      localStorage.removeItem(key);
    }
  }

  insertEmoji(emoji) {
    const recent = this.state.recentEmoji || [];
    this.setState({recentEmoji: [emoji, ...recent.filter(item => item !== emoji)].slice(0, 16)});
    const input = this.messageEditArea;
    const {message} = this.state;
    const start = input?.selectionStart ?? message.length;
    const end = input?.selectionEnd ?? start;
    const next = message.slice(0, start) + emoji + message.slice(end);
    this.saveDraft(next);
    this.setState({message: next, emojiPicker: false}, () => {
      this.messageEditArea?.focus();
      this.messageEditArea?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  handleSend(e) {
    e.preventDefault();
    const message = this.state.message.trim();
    if (message || this.props.acceptBlank || this.props.noInput) {
      this.props.onSendMessage(message);
      this.saveDraft('');
      this.setState({message: ''});
    }
  }

  /* Send on Enter key */
  handleKeyPress(e) {
    if (this.state.audioRec) {
      // Ignore key presses while audio is being recorded.
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Enter pressed: either send, or enter a new line.
    if (e.key === 'Enter' && !e.nativeEvent?.isComposing && e.keyCode !== 229) {
      if (this.props.sendOnEnter == 'plain') {
        // Have Shift-Enter insert a line break instead
        if (!e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();

          this.handleSend(e);
        }
      } else {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();

          this.handleSend(e);
        }
      }
    }
  }

  handleMessageTyping(e) {
    this.setState({message: e.target.value});
    this.saveDraft(e.target.value);
    if (this.props.onKeyPress) {
      const now = new Date().getTime();
      if (now - this.keypressTimestamp > KEYPRESS_DELAY) {
        this.props.onKeyPress();
        this.keypressTimestamp = now;
      }
    }
  }

  handleQuoteClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.props.reply && this.props.onQuoteClick) {
      const replyToSeq = this.props.reply.seq;
      this.props.onQuoteClick(replyToSeq);
    }
  }

  render() {
    const { formatMessage } = this.props.intl;
    const prompt = this.props.disabled ?
      formatMessage(messages.messaging_disabled) :
      (this.props.messagePrompt ?
        formatMessage(messages[this.props.messagePrompt]) :
        formatMessage(messages.type_new_message));

    const sendIcon = (this.props.reply && this.props.reply.editing) ?
      'check_circle' : 'send';

    const quote = this.state.quote ?
      (<div id="reply-quote-preview">
        <div className="cancel">
          <a href="#" onClick={e => {e.preventDefault(); this.props.onCancelReply();}}><i className="material-icons gray">close</i></a>
        </div>
        {this.state.quote}
      </div>) : null;
    const audioEnabled = this.state.audioAvailable && this.props.onAttachAudio;
    return (
      <div id="send-message-wrapper">
        {!this.props.noInput ? quote : null}
        <div id="send-message-panel">
          {!this.props.disabled ?
            <>
              {this.props.onAttachFile && !this.state.audioRec ?
                <>
                  <a href="#" onClick={e => {e.preventDefault(); this.attachImage.click();}} title={formatMessage(messages.icon_title_add_image)}>
                    <i className="material-icons secondary">photo</i>
                  </a>
                  <a href="#" onClick={e => {e.preventDefault(); this.attachFile.click();}} title={formatMessage(messages.icon_title_attach_file)}>
                    <i className="material-icons secondary">attach_file</i>
                  </a>
                </>
                :
                null}
              {this.props.noInput ?
                (quote || <div className="hr thin" />) :
                (this.state.audioRec ?
                  (<Suspense fallback={<div><FormattedMessage id="loading_note" defaultMessage="Loading..."
                  description="Message shown when component is loading"/></div>}>
                    <AudioRecorder
                      onRecordingProgress={_ => this.props.onKeyPress(true)}
                      onDeleted={_ => this.setState({audioRec: false})}
                      onFinished={this.handleAttachAudio}/>
                  </Suspense>) :
                  <textarea id="send-message-input" placeholder={prompt}
                    value={this.state.message} onChange={this.handleMessageTyping}
                    onKeyDown={this.handleKeyPress}
                    ref={ref => {this.messageEditArea = ref;}} />)}
              {!this.props.noInput && !this.state.audioRec &&
                <div className="emoji-picker-anchor" ref={element => { this.emojiPickerAnchor = element; }}>
                  <button type="button" aria-label="表情" title="表情" aria-expanded={!!this.state.emojiPicker}
                    onClick={() => this.setState(state => ({emojiPicker: !state.emojiPicker}))}>
                    <i className="material-icons" aria-hidden="true">emoji_emotions</i>
                  </button>
                  {this.state.emojiPicker && <div className="emoji-picker" aria-label="选择表情"
                    onKeyDown={event => { if (event.key === 'Escape') this.setState({emojiPicker: false}); }}>
                    <div className="emoji-picker-grid">
                      {SMALL_EMOJIS.map(emoji =>
                        (!this.state.showRecentEmoji || this.state.recentEmoji?.includes(emoji)) &&
                          <button type="button" key={emoji} aria-label={emoji} title={emoji}
                            onClick={() => this.insertEmoji(emoji)}>
                            <SmallEmoji emoji={emoji} decorative />
                          </button>)}
                    </div>
                    {this.state.showRecentEmoji && !this.state.recentEmoji?.length && <p>暂无最近使用的表情</p>}
                    <div className="emoji-picker-tabs">
                      <button type="button" aria-pressed={!!this.state.showRecentEmoji}
                        onClick={() => this.setState({showRecentEmoji: true})}>最近</button>
                      <button type="button" aria-pressed={!this.state.showRecentEmoji}
                        onClick={() => this.setState({showRecentEmoji: false})}>小表情</button>
                    </div>
                  </div>}
                </div>}
              {this.state.message || !audioEnabled ?
                <a href="#" onClick={this.handleSend} title={formatMessage(messages.icon_title_send)}>
                  <i className="material-icons">{sendIcon}</i>
                </a> :
                !this.state.audioRec ?
                  <a href="#" onClick={e => {e.preventDefault(); this.setState({audioRec: true})}} title={formatMessage(messages.icon_title_record_voice)}>
                    <i className="material-icons">mic</i>
                  </a> :
                  null
              }
              <input type="file" ref={ref => {this.attachFile = ref}}
                onChange={this.handleAttachFile} style={{display: 'none'}} />
              <input type="file" ref={ref => {this.attachImage = ref}} accept="image/*, video/*"
                onChange={this.handleAttachImage} style={{display: 'none'}} />
            </>
            :
            <div id="writing-disabled">{prompt}</div>
          }
        </div>
      </div>
    );
  }
};

export default injectIntl(SendMessage);








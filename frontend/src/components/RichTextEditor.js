import React, { useEffect, useRef } from 'react';
import '../styles/RichTextEditor.css';

const blockTemplates = {
  lead: '<p><strong>Lead:</strong> Open with the sharpest takeaway so readers know exactly why this matters.</p><p></p>',
  takeaways: '<h3>Key Takeaways</h3><ul><li>First takeaway</li><li>Second takeaway</li><li>Third takeaway</li></ul><p></p>',
  faq: '<h3>FAQ</h3><p><strong>Question:</strong> Add the most common objection here.</p><p><strong>Answer:</strong> Respond clearly and directly.</p><p></p>',
  cta: '<hr><p><strong>Next step:</strong> Tell readers what to do, test, or share after reading.</p><p></p>'
};

function RichTextEditor({ value, onChange, placeholder = 'Write here...', disabled = false }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const syncValue = () => {
    onChange(editorRef.current?.innerHTML || '');
  };

  const runCommand = (command, commandValue = null) => {
    if (disabled) {
      return;
    }

    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    syncValue();
  };

  const insertHtml = (html) => {
    if (disabled) {
      return;
    }

    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    syncValue();
  };

  const handleLink = () => {
    const url = window.prompt('Enter a URL starting with https://');
    if (url) {
      runCommand('createLink', url);
    }
  };

  return (
    <div className="rich-text-shell">
      <div className="rich-text-toolbar">
        <button type="button" onClick={() => runCommand('bold')}>Bold</button>
        <button type="button" onClick={() => runCommand('italic')}>Italic</button>
        <button type="button" onClick={() => runCommand('underline')}>Underline</button>
        <button type="button" onClick={() => runCommand('strikeThrough')}>Strike</button>
        <button type="button" onClick={() => runCommand('formatBlock', '<h2>')}>H2</button>
        <button type="button" onClick={() => runCommand('formatBlock', '<h3>')}>H3</button>
        <button type="button" onClick={() => runCommand('formatBlock', '<blockquote>')}>Quote</button>
        <button type="button" onClick={() => runCommand('insertUnorderedList')}>Bullets</button>
        <button type="button" onClick={() => runCommand('insertOrderedList')}>Numbers</button>
        <button type="button" onClick={() => insertHtml('<pre><code>Code example</code></pre><p></p>')}>Code</button>
        <button type="button" onClick={() => insertHtml('<hr><p></p>')}>Divider</button>
        <button type="button" onClick={() => runCommand('justifyLeft')}>Left</button>
        <button type="button" onClick={() => runCommand('justifyCenter')}>Center</button>
        <button type="button" onClick={() => runCommand('hiliteColor', '#fff3a3')}>Highlight</button>
        <button type="button" onClick={handleLink}>Link</button>
        <button type="button" onClick={() => insertHtml(blockTemplates.lead)}>Lead</button>
        <button type="button" onClick={() => insertHtml(blockTemplates.takeaways)}>Takeaways</button>
        <button type="button" onClick={() => insertHtml(blockTemplates.faq)}>FAQ</button>
        <button type="button" onClick={() => insertHtml(blockTemplates.cta)}>CTA</button>
        <button type="button" onClick={() => runCommand('removeFormat')}>Clear</button>
      </div>
      <div
        ref={editorRef}
        className="rich-text-editor"
        contentEditable={!disabled}
        suppressContentEditableWarning={true}
        data-placeholder={placeholder}
        onInput={syncValue}
      />
    </div>
  );
}

export default RichTextEditor;
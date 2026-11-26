import React from 'react';

export const SMALL_EMOJIS = ['😄','😊','😂','😍','😘','🤩','😮','😜','😎','😏','🤔','😰','😭','😡','😤','🤗',
  '🥺','☺️','🙈','😴','😌','🤤','😵','😱','💡','🥳','😇','😈','🤢','😷','🥶','🥵','🛌','🥰','👍','👎',
  '👌','✌️','👋','😢'];

export function SmallEmoji({emoji, decorative}) {
  const index = SMALL_EMOJIS.indexOf(emoji);
  return <span className="small-emoji" aria-hidden={decorative || undefined}
    role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : emoji}
    style={{backgroundPosition: ((index % 8) * 100 / 7) + '% ' + (Math.floor(index / 8) * 25) + '%'}} />;
}

export function renderSmallEmojis(text) {
  if (typeof text !== 'string') return text;
  return text.split(/(\p{RGI_Emoji})/v).map((part, index) =>
    SMALL_EMOJIS.includes(part) ? <SmallEmoji key={index} emoji={part} /> : part);
}

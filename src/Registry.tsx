import { useState } from 'react';
import { giftDescriptions } from './registry-copy';

const gifts = [
  ['Fund the Gay Agenda', 'M12 20 4 12a4 4 0 0 1 8-3 4 4 0 0 1 8 3Z'],
  ['Somewhere Over the Rainbow', 'M2 19v-2a10 10 0 0 1 20 0v2M6 19v-2a6 6 0 0 1 12 0v2M10 19v-2a2 2 0 0 1 4 0v2'],
  ['Green Fingers, Full Bellies & a Little Sheepishness', 'M12 21v-8M12 15C4 15 3 10 3 5c6 0 9 3 9 8m0 3c0-6 3-9 9-9 0 5-2 9-9 9'],
  ['The Fellowship of the Gays', 'M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-4M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 3a4 4 0 0 1 0 8'],
  ['Give the Gays a Voice', 'M4 10h4l11-5v14L8 14H4zm4 4 2 6h3l-2-5m10-6v6'],
  ['Minds Matter, Too', 'M12 20 4 12a4 4 0 0 1 8-3 4 4 0 0 1 8 3ZM5 13h4l2-3 2 5 2-2h4'],
  ['Education Is the Real Flex', 'm2 9 10-5 10 5-10 5zm4 2v6c3 3 9 3 12 0v-6m4-2v7'],
  ['Gays Without Borders', 'M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0ZM2 12h20M12 2a17 17 0 0 1 0 20 17 17 0 0 1 0-20Z'],
  ['Love Wins. Now Send Us Away.', 'm22 2-7 20-4-9L2 9 22 2ZM11 13 22 2'],
  ['The Art of Being Fabulous', 'm12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z'],
  ['And Everything in Between', 'M3 8h18v4H3zm2 4v9h14v-9m-7-4v13m0-13C4 8 6 1 10 4l2 4c8 0 6-7 2-4z'],
];

const treasury = [
  ['Account Holder', 'INFUSED WORX (PTY) LTD'],
  ['Bank', 'First National Bank (FNB)'],
  ['Account Type', 'Gold Business Account'],
  ['Account Number', '63073671498'],
  ['Branch Code', '255805'],
  ['SWIFT', 'FIRNZAJJ'],
];

function Treasury() {
  const [copyStatus, setCopyStatus] = useState('');
  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(`${label} copied.`);
    } catch {
      setCopyStatus(`Couldn’t copy ${label.toLowerCase()}. You can select and copy the value manually.`);
    }
  }

  return (
    <section className="treasury" aria-labelledby="treasury-title">
      <h3 id="treasury-title">The Treasury of Love</h3>
      <p className="registry-tagline">For those ready to put their money where their love is.</p>
      <p>Whether you are funding a brick, a fellowship, a future or a fabulously ambitious dream, here is where your generosity can find its way. Big gestures, small gestures and outrageously generous gestures are all welcome.</p>
      <p className="review-note">Bank details are awaiting confirmation by the site owner before publication.</p>
      <dl>
        {treasury.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <span>{value}</span>
              <button type="button" onClick={() => copy(label, value)} aria-label={`Copy ${label.toLowerCase()}`}>Copy</button>
            </dd>
          </div>
        ))}
      </dl>
      <p className="copy-status" role="status">{copyStatus}</p>
    </section>
  );
}

export default function Registry() {
  return (
    <section className="registry" id="gift-registry" aria-labelledby="registry-title" data-entrance>
      <div className="gold-divider" aria-hidden="true"><span /></div>
      <header>
        <h2 id="registry-title">The Art of Gay-ving</h2>
        <p className="registry-tagline">For the joy of giving. And the giving of love.</p>
        <div className="registry-letter">
          <p>Dear Family, Friends &amp; Fellow Comrades,</p>
          <p>Between the two of us, we have enough crockery, cutlery, microwaves and toasters to furnish a small nation. As we unite our lives (and fully functioning households), we are taking a slightly unconventional approach to wedding gifts.</p>
          <p>We do not need more things. We would rather make more things possible. Giving back is close to our hearts. So instead of filling our cupboards, help us create belonging, opportunity and brighter futures for others.</p>
        </div>
      </header>
      <div className="gifts">
        {gifts.map(([title, path], index) => (
          <details key={title}>
            <summary>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d={path} /></svg>
              <span>{title}</span>
              <svg className="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </summary>
            <div className="gift-description">
              {giftDescriptions[index].map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </details>
        ))}
      </div>
      <Treasury />
      <section className="closing" aria-labelledby="closing-title">
        <h3 id="closing-title">Our Closing Declaration</h3>
        <p>The greatest gift is the love that brought us here. And love is not only something we share with each other; it is something we can extend into the world. Your presence at our wedding is more than enough. Should you wish to give, we invite you to help us give back.</p>
        <p>Not more possessions, but more possibilities.<br />Not simply a gift for two, but a gesture that reaches many.</p>
        <p className="registry-tagline">For the joy of giving. And the giving of love.</p>
        <p>With love, gratitude and a little fabulousness,<br /><span className="signature">Thami &amp; Wesley Willis</span></p>
      </section>
    </section>
  );
}

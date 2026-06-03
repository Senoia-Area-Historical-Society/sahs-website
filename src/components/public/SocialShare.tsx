import { Facebook, Twitter, Mail, Link as LinkIcon, Check, Instagram } from 'lucide-react';
import { useState } from 'react';

interface SocialShareProps {
  slug: string;
  title: string;
}

export default function SocialShare({ slug, title }: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `https://sahs.site/${slug}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-4 py-4 border-t border-b border-tan/20 mb-8">
      <span className="text-sm font-sans uppercase tracking-wider text-charcoal/60 font-semibold">Share:</span>
      <div className="flex items-center gap-3">
        <a 
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-full bg-tan/10 text-tan hover:bg-tan hover:text-white transition-colors"
          aria-label="Share on Facebook"
        >
          <Facebook size={18} />
        </a>
        <a 
          href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-full bg-tan/10 text-tan hover:bg-tan hover:text-white transition-colors"
          aria-label="Share on X (Twitter)"
        >
          <Twitter size={18} />
        </a>
        <a 
          href={`mailto:?subject=${encodedTitle}&body=Check out this link: ${encodedUrl}`}
          className="p-2 rounded-full bg-tan/10 text-tan hover:bg-tan hover:text-white transition-colors"
          aria-label="Share via Email"
        >
          <Mail size={18} />
        </a>
        <a
          href="https://www.instagram.com/senoiahistory/"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-full bg-tan/10 text-tan hover:bg-tan hover:text-white transition-colors"
          aria-label="Follow us on Instagram"
        >
          <Instagram size={18} />
        </a>
        <button
          onClick={handleCopy}
          className="p-2 rounded-full bg-tan/10 text-tan hover:bg-tan hover:text-white transition-colors"
          aria-label="Copy Link"
        >
          {copied ? <Check size={18} /> : <LinkIcon size={18} />}
        </button>
      </div>
    </div>
  );
}

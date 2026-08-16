import React from 'react';
import DOMPurify from 'dompurify';

interface SvgBlockProps {
  svgContent: string;
}

export const SvgBlock: React.FC<SvgBlockProps> = ({ svgContent }) => {
  const cleanSvg = DOMPurify.sanitize(svgContent, {
    USE_PROFILES: { svg: true, svgFilters: true },
  });

  return (
    <div className="my-3 p-4 bg-[#181825] rounded-lg border border-[#313244] shadow-md flex justify-center overflow-x-auto">
      <div dangerouslySetInnerHTML={{ __html: cleanSvg }} />
    </div>
  );
};

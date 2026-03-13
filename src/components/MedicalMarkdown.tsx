'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

type Props = {
  content: string;
};

export default function MedicalMarkdown({ content }: Props) {
  return (
    <div className="medical-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          table: ({ ...props }) => (
            <div className="table-wrapper">
              <table {...props} />
            </div>
          ),
          th: ({ ...props }) => <th className="clinical-th" {...props} />,
          td: ({ ...props }) => <td className="clinical-td" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
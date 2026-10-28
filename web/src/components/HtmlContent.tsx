import DOMPurify from 'dompurify'

import { urlMidia } from '@/api/uploads'
import { cn } from '@/lib/utils'

/** Reescreve src relativos (/uploads/...) para a URL da API. */
function reescreverMidias(html: string): string {
  return html.replace(
    /(<img[^>]+src=["'])(\/uploads\/[^"']+)(["'])/gi,
    (_m, pre, path, pos) => `${pre}${urlMidia(path)}${pos}`,
  )
}

interface HtmlContentProps {
  html: string
  className?: string
}

export function HtmlContent({ html, className }: HtmlContentProps) {
  const limpo = DOMPurify.sanitize(reescreverMidias(html || ''), {
    ADD_ATTR: ['target'],
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4',
      'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre',
      'span', 'div',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
  })

  return (
    <div
      className={cn('prose-chamado text-sm leading-relaxed', className)}
      dangerouslySetInnerHTML={{ __html: limpo }}
    />
  )
}

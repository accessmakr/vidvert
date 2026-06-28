/**
 * src/components/Breadcrumb.jsx
 * PHASE 3 — Pure visual breadcrumb trail. Like FaqAccordion, the
 * schema emission (BreadcrumbList) happens centrally at the page
 * level via buildBreadcrumbSchema, not inside this component.
 *
 * items: [{ name: 'Home', path: '/' }, { name: 'Tools', path: '/tools' },
 *          { name: 'Current Page' }]  — last item has no path (current page)
 */

import { Link } from 'react-router-dom';

export default function Breadcrumb({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="w-full max-w-xl">
      <ol className="flex items-center gap-1.5 text-xs text-zinc-500 flex-wrap">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {item.path && !isLast ? (
                <Link to={item.path} className="hover:text-zinc-300 transition-colors">
                  {item.name}
                </Link>
              ) : (
                <span className={isLast ? 'text-zinc-300' : ''} aria-current={isLast ? 'page' : undefined}>
                  {item.name}
                </span>
              )}
              {!isLast && <span aria-hidden="true" className="text-zinc-700">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

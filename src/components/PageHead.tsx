import Link from 'next/link';

/** Title band for content pages. */
export default function PageHead({ eyebrow, title, intro, crumb, children }: { eyebrow: string; title: string; intro?: string; crumb?: [string, string]; children?: React.ReactNode }) {
  return (
    <div className="page-hd">
      <div className="wrap">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          {crumb && <><span aria-hidden="true">/</span><Link href={crumb[1]}>{crumb[0]}</Link></>}
          <span aria-hidden="true">/</span><span aria-current="page">{title}</span>
        </nav>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
        {children}
      </div>
    </div>
  );
}

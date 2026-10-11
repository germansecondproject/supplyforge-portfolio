/**
 * Stand-in for a listing while its products stream in. It uses the same classes and line boxes as the real page
 * (breadcrumb, heading, filters, toolbar and 24 product cards), so the footer and the grid do not jump when the
 * products arrive.
 */
export default function ListingSkeleton({ label = 'Loading products…', subnav = false }: { label?: string; subnav?: boolean }) {
  return (
    <div className="sk" aria-busy="true">
      <p className="sr" role="status">{label}</p>
      <nav className="crumbs" aria-hidden="true"><span>&nbsp;</span></nav>
      <div className="list-head" aria-hidden="true">
        <h1><span className="sk-bar" style={{ width: '12ch' }}>&nbsp;</span></h1>
        <p className="muted"><span className="sk-bar" style={{ width: '40ch' }}>&nbsp;</span></p>
      </div>
      {subnav && <div className="subnav" aria-hidden="true"><span className="sk-chip" /></div>}
      <div className="list-grid" aria-hidden="true">
        <div className="filters sk-filters" />
        <section>
          <div className="toolbar"><p className="count">&nbsp;</p><span className="sk-sort" /></div>
          <div className="rail three">
            {Array.from({ length: 24 }, (_, i) => (
              <article className="card" key={i}>
                <div className="card-img" />
                <div className="card-body">
                  <span className="ref">&nbsp;</span>
                  <h3>&nbsp;<br />&nbsp;</h3>
                  <ul className="specs3"><li>&nbsp;</li><li>&nbsp;</li><li>&nbsp;</li></ul>
                  <span className="rating">&nbsp;</span>
                  <div className="price-row"><span className="price num">&nbsp;</span><small style={{ flexBasis: '100%', fontSize: '.75rem' }}>&nbsp;</small></div>
                </div>
                <div className="card-foot"><span className="sk-btn" /></div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

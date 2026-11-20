import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import EventDetail, { FoldableSqlRow, SQL_FOLD_THRESHOLD } from './index';

describe('MySQL EventDetail FoldableSqlRow', () => {
  it('renders short single-line SQL (<= 120 chars) directly without toggle button', () => {
    const shortSql = 'SELECT count(*) AS cnt FROM gyy_trap_17000.trap_event WHERE restore_flag = 0';
    expect(shortSql.length).toBeLessThanOrEqual(SQL_FOLD_THRESHOLD);

    render(<FoldableSqlRow queryRef='A' sql={shortSql} />);
    expect(screen.getByText(`$A: ${shortSql}`)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('collapses ultra-long 2800-char SQL to 120-char single-line preview by default and toggles expand/collapse', () => {
    const prefix = 'SELECT e.device_name AS device_ip, e.source_ip AS trap_src, ';
    const middle = 'COALESCE(r.occur_time, e.occur_time) AS occur_time, '.repeat(52);
    const tailMarker = 'ORDER BY e.restore_flag ASC, e.id DESC /* TAIL_MARKER */';
    const longSql = `${prefix}${middle}${tailMarker}`;
    expect(longSql.length).toBeGreaterThan(2700);

    const items = EventDetail();
    const sqlRowDef = items[0];
    const { container } = render(
      <div>
        {sqlRowDef.render({
          queries: [{ ref: 'A', sql: longSql }],
        })}
      </div>,
    );

    const toggleBtn = screen.getByRole('button', { name: '展开' });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(container.textContent).not.toContain('TAIL_MARKER');
    expect(container.textContent).toContain(`$A: ${longSql.slice(0, SQL_FOLD_THRESHOLD)}…`);

    fireEvent.click(toggleBtn);
    const collapseBtn = screen.getByRole('button', { name: '收起' });
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');
    expect(container.textContent).toContain('TAIL_MARKER');
    expect(container.textContent).toContain(longSql);

    fireEvent.click(collapseBtn);
    expect(screen.getByRole('button', { name: '展开' })).toHaveAttribute('aria-expanded', 'false');
    expect(container.textContent).not.toContain('TAIL_MARKER');
  });

  it('collapses multi-line SQL into a single-line preview by default even when <= 120 chars', () => {
    const multilineSql = 'SELECT id,\n  alarm_csn\nFROM trap_event\nWHERE restore_flag = 0';
    const { container } = render(<FoldableSqlRow queryRef='B' sql={multilineSql} />);

    const expandBtn = screen.getByRole('button', { name: '展开' });
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
    expect(container.textContent).toContain('$B: SELECT id, alarm_csn FROM trap_event WHERE restore_flag = 0…');

    fireEvent.click(expandBtn);
    expect(screen.getByRole('button', { name: '收起' })).toHaveAttribute('aria-expanded', 'true');
    expect(container.querySelector('span')?.textContent).toBe(`$B: ${multilineSql}`);
  });
});

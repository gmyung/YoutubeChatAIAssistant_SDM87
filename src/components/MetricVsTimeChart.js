import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function MetricVsTimeChart({ data, metricField, timeField }) {
  const [enlarged, setEnlarged] = useState(false);

  if (!data?.length) return null;

  const chart = (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 16, left: 0, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
          tickLine={false}
          angle={-45}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          dataKey="value"
          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={55}
          tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : v)}
        />
        <Tooltip
          contentStyle={{
            background: 'rgba(15, 15, 35, 0.92)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            color: '#e2e8f0',
          }}
          formatter={(value) => [value?.toLocale?.() ?? value, metricField || 'value']}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#818cf8"
          strokeWidth={2}
          dot={{ fill: '#818cf8', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const wrap = (
    <div className="metric-vs-time-wrap">
      <p className="metric-vs-time-label">
        {metricField || 'Metric'} vs {timeField || 'Time'}
      </p>
      <div
        className="metric-vs-time-chart"
        role="button"
        tabIndex={0}
        onClick={() => setEnlarged(true)}
        onKeyDown={(e) => e.key === 'Enter' && setEnlarged(true)}
      >
        {chart}
      </div>
      <p className="metric-vs-time-hint">Click to enlarge</p>
      {enlarged && (
        <div
          className="metric-vs-time-overlay"
          onClick={() => setEnlarged(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setEnlarged(false)}
        >
          <div className="metric-vs-time-modal" onClick={(e) => e.stopPropagation()}>
            <div className="metric-vs-time-modal-header">
              <span>{metricField || 'Metric'} vs time</span>
              <button type="button" onClick={() => setEnlarged(false)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="metric-vs-time-modal-body">{chart}</div>
          </div>
        </div>
      )}
    </div>
  );

  return wrap;
}

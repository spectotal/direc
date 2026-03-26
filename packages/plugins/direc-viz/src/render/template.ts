export function buildHtmlTemplate(dataJson: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Direc Architecture Report</title>

  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18.3.1",
      "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
      "@xyflow/react": "https://esm.sh/@xyflow/react@12.3.6?deps=react@18.3.1,react-dom@18.3.1",
      "@dagrejs/dagre": "https://esm.sh/@dagrejs/dagre@1.1.4"
    }
  }
  </script>

  <link rel="stylesheet" href="https://unpkg.com/@xyflow/react@12.3.6/dist/style.css" />
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Design tokens ──────────────────────────────────────────────────────── */
    :root {
      --sidebar-w:  clamp(260px, 22vw, 480px);
      --footer-h:   clamp(180px, 22vh, 280px);
      --header-h:   48px;
      --gap:        1px;
      --bg:         #0f1117;
      --surface:    #1a1d27;
      --border:     #2d3748;
      --text:       #e2e8f0;
      --muted:      #718096;
      --accent:     #a78bfa;
    }

    /* ── Base ───────────────────────────────────────────────────────────────── */
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      height: 100dvh;
      display: grid;
      grid-template-rows: var(--header-h) 1fr var(--footer-h);
      overflow: hidden;
    }

    /* ── Header ─────────────────────────────────────────────────────────────── */
    header {
      padding: 0 20px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      min-height: var(--header-h);
    }

    header h1 { font-size: 15px; font-weight: 600; color: var(--accent); white-space: nowrap; }
    .meta { font-size: 12px; color: var(--muted); }

    #history-selector-wrapper {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #history-selector-wrapper label { font-size: 12px; color: var(--muted); }

    select {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }

    /* ── Main two-column grid ───────────────────────────────────────────────── */
    .main-grid {
      display: grid;
      grid-template-columns: 1fr var(--sidebar-w);
      grid-template-rows: 1fr;
      overflow: hidden;
      gap: var(--gap);
      background: var(--border);
      min-height: 0;
    }

    /* ── Panels ─────────────────────────────────────────────────────────────── */
    .panel {
      background: var(--surface);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    }

    .panel-header {
      padding: 8px 14px;
      font-size: 11px;
      font-weight: 600;
      color: #a0aec0;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .badge { font-size: 10px; padding: 1px 6px; border-radius: 10px; font-weight: 500; }
    .badge-red    { background: #7f1d1d; color: #fca5a5; }
    .badge-amber  { background: #78350f; color: #fcd34d; }
    .badge-green  { background: #14532d; color: #86efac; }

    /* ── Architecture diagram ───────────────────────────────────────────────── */
    #diagram-container { flex: 1; position: relative; overflow: hidden; min-height: 0; }
    #diagram { width: 100%; height: 100%; }

    .no-data {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: #4a5568;
      font-size: 13px;
      text-align: center;
      padding: 20px;
    }

    /* React Flow dark theme */
    .react-flow {
      --xy-background-color: var(--bg);
      --xy-controls-button-background-color: #2d3748;
      --xy-controls-button-background-color-hover: #4a5568;
      --xy-controls-button-color: var(--text);
      --xy-controls-button-border-color: #4a5568;
    }
    .react-flow__attribution { display: none; }

    /* ── Complexity heatmap ─────────────────────────────────────────────────── */
    #heatmap-panel { overflow-y: auto; }
    #heatmap { padding: 8px; display: flex; flex-direction: column; gap: 2px; }

    .hm-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 6px;
      border-radius: 3px;
      font-size: 11px;
      cursor: default;
    }
    .hm-bar { flex: 0 0 auto; height: 8px; border-radius: 2px; }
    .hm-path {
      font-family: monospace;
      font-size: 10px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }
    .hm-score { font-size: 10px; color: #a0aec0; white-space: nowrap; }
    .hm-row.warn-border  { outline: 1px solid #d97706; }
    .hm-row.error-border { outline: 1px solid #dc2626; }

    /* ── Tooltip ────────────────────────────────────────────────────────────── */
    #tooltip {
      position: fixed;
      background: #2d3748;
      border: 1px solid #4a5568;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 12px;
      pointer-events: none;
      z-index: 9999;
      display: none;
      max-width: 280px;
      line-height: 1.6;
    }
    #tooltip strong { color: var(--accent); }

    /* ── Progress timeline footer ───────────────────────────────────────────── */
    footer {
      background: var(--surface);
      border-top: 1px solid var(--border);
      padding: 8px 16px 10px;
      height: var(--footer-h);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    }
    footer .panel-header { padding: 0 0 6px; border: none; }
    #timeline-wrapper { flex: 1; min-height: 0; position: relative; }
    #timeline-wrapper canvas { width: 100% !important; height: 100% !important; }
    #timeline-hidden-msg {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: #4a5568;
      font-size: 12px;
    }

    /* ── Responsive: tablet (narrow sidebar) ───────────────────────────────── */
    @media (max-width: 900px) {
      :root {
        --sidebar-w: 260px;
        --footer-h:  165px;
      }
    }

    /* ── Responsive: mobile (stack vertically) ─────────────────────────────── */
    @media (max-width: 640px) {
      body {
        height: auto;
        min-height: 100dvh;
        overflow-y: auto;
        grid-template-rows: var(--header-h) auto auto auto;
      }
      .main-grid {
        grid-template-columns: 1fr;
        grid-template-rows: 55vw auto;
        height: auto;
        overflow: visible;
        background: transparent;
        gap: var(--gap);
      }
      #heatmap-panel {
        max-height: 320px;
        border-top: 1px solid var(--border);
      }
      footer {
        height: 200px;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>Direc Architecture Report</h1>
    <span class="meta" id="generated-at"></span>
    <span class="meta" id="summary-badges"></span>
    <div id="history-selector-wrapper" style="display:none">
      <label for="history-select">Snapshot:</label>
      <select id="history-select"></select>
    </div>
  </header>

  <div class="main-grid">
    <div class="panel">
      <div class="panel-header">
        Architecture Diagram
        <span class="badge badge-red" id="violation-badge" style="display:none"></span>
      </div>
      <div id="diagram-container">
        <div id="diagram"></div>
        <div class="no-data" id="diagram-nodata" style="display:none">
          No architecture data available.<br/>Run <code>direc analyze</code> first.
        </div>
      </div>
    </div>

    <div class="panel" id="heatmap-panel">
      <div class="panel-header">Complexity Heatmap</div>
      <div id="heatmap"></div>
      <div class="no-data" id="heatmap-nodata" style="display:none">
        No complexity data available.
      </div>
    </div>
  </div>

  <footer>
    <div class="panel-header">Progress Timeline</div>
    <div id="timeline-wrapper">
      <canvas id="timeline-chart"></canvas>
      <div id="timeline-hidden-msg" style="display:none">
        No history data. Run <code>direc analyze</code> across multiple changes.
      </div>
    </div>
  </footer>

  <div id="tooltip"></div>

  <script>window.__DIREC_DATA__ = ${dataJson};</script>

  <!-- Header / heatmap / timeline (non-module, runs synchronously) -->
  <script>
  (function () {
    'use strict';
    var data = window.__DIREC_DATA__;

    function formatTs(ts) {
      try { return new Date(ts).toLocaleString(); } catch(e) { return ts; }
    }

    function maintainabilityColor(score) {
      var r = score < 50 ? 220 : Math.round(220 - (score - 50) * 3.4);
      var g = score < 50 ? Math.round(score * 3) : 166;
      return 'rgb(' + Math.min(255,r) + ',' + Math.min(255,g) + ',60)';
    }

    // Header
    document.getElementById('generated-at').textContent = 'Generated: ' + formatTs(data.generatedAt);
    var vCount = data.violations.length;
    var cCount = data.roles.length;
    var fCount = data.complexity.length;
    document.getElementById('summary-badges').innerHTML =
      '<span class="badge ' + (vCount > 0 ? 'badge-red' : 'badge-green') + '">' +
      vCount + ' violation' + (vCount !== 1 ? 's' : '') + '</span> ' +
      '<span class="badge badge-green">' + cCount + ' roles</span> ' +
      '<span class="badge badge-green">' + fCount + ' files</span>';

    // Violation badge (updated here; React Flow diagram mounts async)
    var totalViolations = data.violations.length;
    if (totalViolations > 0) {
      var badge = document.getElementById('violation-badge');
      badge.textContent = totalViolations + ' violation' + (totalViolations !== 1 ? 's' : '');
      badge.style.display = 'inline';
    }

    // History selector
    var currentIndex = data.history.length - 1;
    if (data.history.length >= 2) {
      var wrapper = document.getElementById('history-selector-wrapper');
      var sel = document.getElementById('history-select');
      wrapper.style.display = 'flex';
      data.history.forEach(function(pt, i) {
        var opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = formatTs(pt.timestamp) + ' (' + pt.changeId + ')';
        if (i === data.history.length - 1) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', function() {
        currentIndex = parseInt(sel.value, 10);
        refreshTimeline();
      });
    }

    // Complexity heatmap
    var tooltip = document.getElementById('tooltip');
    var heatmapEl = document.getElementById('heatmap');
    var heatmapNodata = document.getElementById('heatmap-nodata');
    if (!data.complexity || data.complexity.length === 0) {
      heatmapNodata.style.display = 'flex';
    } else {
      var warn  = data.complexityThresholds.warningThreshold;
      var error = data.complexityThresholds.errorThreshold;
      var sorted = data.complexity.slice().sort(function(a, b) { return a.maintainability - b.maintainability; });
      sorted.forEach(function(f) {
        var row = document.createElement('div');
        row.className = 'hm-row';
        if (f.cyclomatic >= error) row.classList.add('error-border');
        else if (f.cyclomatic >= warn) row.classList.add('warn-border');

        var bar = document.createElement('div');
        bar.className = 'hm-bar';
        bar.style.background = maintainabilityColor(f.maintainability);
        bar.style.width = Math.max(4, f.maintainability) + 'px';

        var path = document.createElement('span');
        path.className = 'hm-path';
        // Cell shows only the filename
        path.textContent = f.path.split('/').pop();

        var repoRoot = data.repositoryRoot ? data.repositoryRoot.replace(/\\\\$/, '') : '';
        var repoRelPath = (repoRoot && f.path.startsWith(repoRoot))
          ? f.path.slice(repoRoot.length).replace(/^\\//, '')
          : f.path;

        var score = document.createElement('span');
        score.className = 'hm-score';
        score.textContent = Math.round(f.maintainability);

        row.appendChild(bar);
        row.appendChild(path);
        row.appendChild(score);

        row.addEventListener('mousemove', function(ev) {
          tooltip.style.display = 'block';
          tooltip.style.left = (ev.clientX + 14) + 'px';
          tooltip.style.top  = (ev.clientY - 10) + 'px';
          // Tooltip shows full repo-relative path + metrics
          tooltip.innerHTML =
            '<strong>' + repoRelPath + '</strong><br/>' +
            'Maintainability: ' + f.maintainability.toFixed(1) + '<br/>' +
            'Cyclomatic: ' + f.cyclomatic + '<br/>' +
            'SLOC: ' + f.logicalSloc;
        });
        row.addEventListener('mouseleave', function() { tooltip.style.display = 'none'; });
        heatmapEl.appendChild(row);
      });
    }

    // Timeline
    var timelineChart = null;
    function refreshTimeline() {
      if (!timelineChart || data.history.length === 0) return;
      timelineChart.data.datasets.forEach(function(ds) {
        ds.pointRadius = data.history.map(function(_, i) { return i === currentIndex ? 6 : 3; });
        ds.pointBackgroundColor = data.history.map(function(_, i) { return i === currentIndex ? '#a78bfa' : undefined; });
      });
      timelineChart.update();
    }

    var canvas  = document.getElementById('timeline-chart');
    var hiddenMsg = document.getElementById('timeline-hidden-msg');
    if (!data.history || data.history.length === 0) {
      canvas.style.display = 'none';
      hiddenMsg.style.display = 'flex';
    } else if (typeof Chart === 'undefined') {
      canvas.style.display = 'none';
      hiddenMsg.textContent = 'Chart.js CDN not loaded.';
      hiddenMsg.style.display = 'flex';
    } else {
      timelineChart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: data.history.map(function(p) { return formatTs(p.timestamp); }),
          datasets: [
            { label: 'Violations',   data: data.history.map(function(p) { return p.metrics.violations; }),   borderColor: '#ef4444', backgroundColor: '#ef444422', tension: 0.3, pointRadius: 3 },
            { label: 'Cycles',       data: data.history.map(function(p) { return p.metrics.cycles; }),       borderColor: '#f59e0b', backgroundColor: '#f59e0b22', tension: 0.3, pointRadius: 3 },
            { label: 'Avg Maintainability', data: data.history.map(function(p) { return p.metrics.avgComplexity; }), borderColor: '#22c55e', backgroundColor: '#22c55e22', tension: 0.3, pointRadius: 3, yAxisID: 'y2' },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          plugins: { legend: { labels: { color: '#a0aec0', boxWidth: 12, font: { size: 11 } } } },
          scales: {
            x:  { ticks: { color: '#718096', font: { size: 9 }, maxTicksLimit: 8 }, grid: { color: '#2d374844' } },
            y:  { title: { display: true, text: 'Count', color: '#718096', font: { size: 10 } }, ticks: { color: '#718096', font: { size: 10 } }, grid: { color: '#2d374844' }, beginAtZero: true },
            y2: { position: 'right', title: { display: true, text: 'Maintainability', color: '#718096', font: { size: 10 } }, ticks: { color: '#718096', font: { size: 10 } }, grid: { drawOnChartArea: false }, min: 0, max: 100 },
          },
        },
      });
    }
  })();
  </script>

  <!-- React Flow diagram (module, runs after DOMContentLoaded) -->
  <script type="module">
  import React, { useMemo, useState, useRef, useCallback } from 'react';
  import { createRoot } from 'react-dom/client';
  import {
    ReactFlow, Controls, Background, MarkerType,
    useNodesState, useEdgesState,
  } from '@xyflow/react';
  import dagre from '@dagrejs/dagre';

  var data = window.__DIREC_DATA__;
  var ce = React.createElement;

  var NODE_W = 200;
  var NODE_H = 72;

  /* ── Dagre layout ──────────────────────────────────────────────────────── */
  function computeLayout(roles, edges) {
    var g = new dagre.graphlib.Graph({ compound: true });
    g.setDefaultEdgeLabel(function() { return {}; });
    g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40, edgesep: 20, marginx: 40, marginy: 40 });
    roles.forEach(function(r) { g.setNode(r.id, { width: NODE_W, height: NODE_H }); });
    edges.forEach(function(e) {
      if (!e.violation && g.hasNode(e.from) && g.hasNode(e.to)) g.setEdge(e.from, e.to);
    });
    dagre.layout(g);
    var positions = {};
    roles.forEach(function(r) {
      var n = g.node(r.id);
      positions[r.id] = { x: n.x - NODE_W / 2, y: n.y - NODE_H / 2 };
    });
    return positions;
  }

  /* ── Colour helpers ────────────────────────────────────────────────────── */
  function nodeColors(violationCount) {
    if (violationCount === 0) return { bg: '#0f2744', border: '#3b82f6', text: '#93c5fd' };
    if (violationCount < 3)   return { bg: '#2d1b00', border: '#f59e0b', text: '#fcd34d' };
    return { bg: '#2d0a0a', border: '#ef4444', text: '#fca5a5' };
  }

  /* ── Node label ────────────────────────────────────────────────────────── */
  function NodeLabel(props) {
    var r = props.role;
    var colors = nodeColors(r.violationCount);
    return ce('div', { style: { fontSize: '11px', lineHeight: '1.4', textAlign: 'center', padding: '2px' } },
      ce('div', { style: { fontWeight: 600, color: colors.text, marginBottom: '2px', wordBreak: 'break-word' } }, r.label),
      r.description
        ? ce('div', { style: { fontSize: '9px', color: '#94a3b8' } },
            r.description.length > 55 ? r.description.slice(0, 53) + '\u2026' : r.description)
        : null,
      r.violationCount > 0
        ? ce('div', { style: { fontSize: '9px', color: colors.border, marginTop: '3px' } },
            '\u26A0 ' + r.violationCount + ' violation' + (r.violationCount !== 1 ? 's' : ''))
        : null
    );
  }

  /* ── Diagram ───────────────────────────────────────────────────────────── */
  function ArchDiagram() {
    var positions = useMemo(function() { return computeLayout(data.roles, data.edges); }, []);

    // Base nodes/edges (positions tracked by React Flow for dragging)
    var initialNodes = useMemo(function() {
      return data.roles.map(function(r) {
        var colors = nodeColors(r.violationCount);
        return {
          id: r.id,
          position: positions[r.id] || { x: 0, y: 0 },
          data: { label: ce(NodeLabel, { role: r }), colors: colors },
          style: {
            background: colors.bg,
            border: '1px solid ' + colors.border,
            borderRadius: r.id === '__unassigned__' ? '50%' : '6px',
            padding: '8px 12px',
            width: NODE_W + 'px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
            transition: 'opacity 0.15s ease, box-shadow 0.15s ease',
          },
          type: 'default',
        };
      });
    }, [positions]);

    var initialEdges = useMemo(function() {
      return data.edges.map(function(e, i) {
        return {
          id: 'e-' + i,
          source: e.from,
          target: e.to,
          type: 'smoothstep',
          animated: e.violation,
          _violation: e.violation,
          style: {
            stroke: e.violation ? '#ef4444' : '#334155',
            strokeWidth: e.violation ? 2 : 1,
            transition: 'opacity 0.15s ease',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: e.violation ? '#ef4444' : '#334155',
            width: 14, height: 14,
          },
        };
      });
    }, []);

    var nodesState = useNodesState(initialNodes);
    var edgesState = useEdgesState(initialEdges);
    var rfNodes = nodesState[0], onNodesChange = nodesState[2];
    var rfEdges = edgesState[0], onEdgesChange = edgesState[2];

    /* ── Highlight state ─────────────────────────────────────────────────── */
    var activeIdState = useState(null);
    var activeId = activeIdState[0], setActiveId = activeIdState[1];
    var pinnedRef = useRef(false);   // click locks the highlight

    // Sets of connected node/edge IDs for the active node
    var connected = useMemo(function() {
      if (!activeId) return null;
      var nodeIds = new Set([activeId]);
      var edgeIds = new Set();
      rfEdges.forEach(function(e) {
        if (e.source === activeId || e.target === activeId) {
          edgeIds.add(e.id);
          nodeIds.add(e.source);
          nodeIds.add(e.target);
        }
      });
      return { nodeIds: nodeIds, edgeIds: edgeIds };
    }, [activeId, rfEdges]);

    // Overlay highlight/dim on top of drag-tracked nodes
    var displayNodes = useMemo(function() {
      if (!connected) return rfNodes;
      return rfNodes.map(function(n) {
        var isConnected = connected.nodeIds.has(n.id);
        var isActive    = n.id === activeId;
        return Object.assign({}, n, {
          style: Object.assign({}, n.style, {
            opacity: isConnected ? 1 : 0.12,
            boxShadow: isActive
              ? '0 0 0 2px ' + n.data.colors.border + ', 0 0 18px ' + n.data.colors.border + '88'
              : isConnected
                ? '0 0 0 1px ' + n.data.colors.border + '66, 0 2px 10px rgba(0,0,0,0.5)'
                : 'none',
          }),
        });
      });
    }, [rfNodes, connected, activeId]);

    // Overlay highlight/dim on top of edges
    var displayEdges = useMemo(function() {
      if (!connected) return rfEdges;
      return rfEdges.map(function(e) {
        var isHighlighted = connected.edgeIds.has(e.id);
        return Object.assign({}, e, {
          animated: isHighlighted || e._violation,
          style: Object.assign({}, e.style, {
            opacity:     isHighlighted ? 1 : 0.04,
            strokeWidth: isHighlighted ? (e._violation ? 3 : 2.5) : (e._violation ? 2 : 1),
            stroke:      isHighlighted ? (e._violation ? '#f87171' : '#64748b') : e.style.stroke,
          }),
          markerEnd: Object.assign({}, e.markerEnd, {
            color: isHighlighted ? (e._violation ? '#f87171' : '#64748b') : e.markerEnd.color,
          }),
        });
      });
    }, [rfEdges, connected]);

    /* ── Event handlers ──────────────────────────────────────────────────── */
    var onNodeMouseEnter = useCallback(function(evt, node) {
      if (!pinnedRef.current) setActiveId(node.id);
    }, []);

    var onNodeMouseLeave = useCallback(function() {
      if (!pinnedRef.current) setActiveId(null);
    }, []);

    var onNodeClick = useCallback(function(evt, node) {
      if (pinnedRef.current && activeId === node.id) {
        pinnedRef.current = false;
        setActiveId(null);
      } else {
        pinnedRef.current = true;
        setActiveId(node.id);
      }
    }, [activeId]);

    var onPaneClick = useCallback(function() {
      pinnedRef.current = false;
      setActiveId(null);
    }, []);

    return ce(ReactFlow, {
        nodes: displayNodes,
        edges: displayEdges,
        onNodesChange: onNodesChange,
        onEdgesChange: onEdgesChange,
        onNodeMouseEnter: onNodeMouseEnter,
        onNodeMouseLeave: onNodeMouseLeave,
        onNodeClick: onNodeClick,
        onPaneClick: onPaneClick,
        colorMode: 'dark',
        fitView: true,
        fitViewOptions: { padding: 0.15 },
        minZoom: 0.05,
        maxZoom: 4,
        proOptions: { hideAttribution: true },
      },
      ce(Controls, { showInteractive: false }),
      ce(Background, { color: '#1e2433', gap: 24, size: 1 })
    );
  }

  /* ── Mount ─────────────────────────────────────────────────────────────── */
  var container = document.getElementById('diagram');
  if (!data.roles || data.roles.length === 0) {
    document.getElementById('diagram-nodata').style.display = 'flex';
    container.style.display = 'none';
  } else {
    createRoot(container).render(ce(ArchDiagram, null));
  }
  </script>
</body>
</html>`;
}

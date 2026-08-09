// Map bridge — turns a /data.json tree into a SpaceAPI-style fragment
// (api_compatibility 14) for publishing the machine as a space signal on
// Maps of Making: activity becomes state.open, temperatures and fans become
// sensors. Pure: depends only on window.OHMParse.
//
// Optional meta (site-configurable via window.OHM_BRIDGE_META) enriches the
// fragment with two open protocols, carried as SpaceAPI ext_* extensions:
//
// - Four Corners (fourcornersproject.org): attribution that travels with
//   imagery — authorship (credit/license), backstory, related imagery, links.
// - IIIF Image API 3 (iiif.io): a service block so any IIIF viewer can
//   deep-zoom the machine photo the space publishes.
//
// meta = {
//   url, location: {lat, lon}, contact: {...},
//   image: { static: 'https://…/machine.jpg', iiif: 'https://…/iiif/machine' },
//   fourCorners: { authorship: {credit, license}, backstory: {text},
//                  imagery: {media: […]}, links: {links: […]} },
//   capabilities: ['Q332988', 'http://www.wikidata.org/entity/Q685', …],
//   equipment: [{ equipment_type, manufacturing_process, make, model, … }]
// }
//
// capabilities/equipment follow the OHM×MoM integration plan (upstream
// maps_of_making docs/draft/ohm-mom-integration.md): manufacturing
// capabilities anchor to Wikidata QIDs — the shared vocabulary hub between
// Maps of Making's activity ontology (owl:sameAs) and Open Hardware
// Manager's OKW records — emitted here as ext_tags (full Wikidata entity
// IRIs) and ext_okw.equipment (OKW field names, passed through verbatim).
// SpaceAPI v14 ext_ prefixing, like the other extensions; revisit the key
// shape when MoM's ingestion of capability blocks lands (their phase 3).
(function () {
  'use strict';

  /** 'Q332988' | full IRI → canonical Wikidata entity IRI (null if neither). */
  function wikidataIRI(c) {
    if (/^Q\d+$/.test(c)) return 'http://www.wikidata.org/entity/' + c;
    if (/^https?:\/\//.test(c)) return c;
    return null;
  }

  /** SpaceAPI-style fragment as a plain object. */
  function fragment(root, meta) {
    meta = meta || window.OHM_BRIDGE_META || {};
    const blocks = window.OHMParse.flatten(root);
    const machineNode = (root.Children || [])[0];
    const machine = machineNode ? machineNode.Text : 'machine';
    const temps = [], fans = [];
    blocks.forEach(b => b.sensors.forEach(s => {
      if (s.n == null) return;
      const loc = machine + ' / ' + b.name;
      if (s.cat === 'temperature') temps.push({ value: s.n, unit: '°C', location: loc, name: s.name });
      if (s.cat === 'fan') fans.push({ value: Math.round(s.n), unit: 'RPM', location: loc, name: s.name });
    }));
    const anyLoad = blocks.some(b => b.sensors.some(s => s.cat === 'load' && s.n != null && s.n > 5));

    const fc = meta.fourCorners || {};
    const doc = {
      api_compatibility: ['14'],
      space: machine,
      url: meta.url || 'https://example.org',
      location: meta.location || { lat: 0, lon: 0 },
      state: {
        open: anyLoad,
        message: anyLoad ? 'machine active — sensors report load' : 'machine idle',
        lastchange: Math.floor(Date.now() / 1000)
      },
      sensors: { temperature: temps, fan_speed: fans },
      contact: meta.contact || {},
      // Four Corners: attribution stays attached when the signal travels.
      // The backstory defaults to honest provenance; meta can override any corner.
      ext_fourcorners: {
        authorship: fc.authorship || { credit: machine + ' operator', license: 'CC BY 4.0' },
        backstory: fc.backstory ||
          { text: 'Live hardware telemetry from ' + machine + ' via Open Hardware Monitor.' },
        imagery: fc.imagery || { media: [] },
        links: fc.links || { links: [] }
      },
      'x-source': meta.source || 'open hardware monitor /data.json web dashboard'
    };
    if (meta.capabilities && meta.capabilities.length) {
      var tags = meta.capabilities.map(wikidataIRI).filter(function (t) { return t; });
      if (tags.length) doc.ext_tags = tags;
    }
    if (meta.equipment && meta.equipment.length) {
      doc.ext_okw = { equipment: meta.equipment };
    }
    if (meta.image && meta.image.static) doc.logo = meta.image.static;
    if (meta.image && meta.image.iiif) {
      doc.ext_iiif = {
        '@context': 'http://iiif.io/api/image/3/context.json',
        id: meta.image.iiif,
        type: 'ImageService3',
        profile: 'level1'
      };
    }
    return doc;
  }

  /** The fragment pretty-printed, ready for the receipt pane / clipboard. */
  function json(root, meta) {
    return JSON.stringify(fragment(root, meta), null, 2);
  }

  window.OHMBridge = { fragment, json };
})();

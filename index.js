/*
  saltcorn-rich-autocomplete
  Configurable rich search dropdown for Saltcorn.

  Notes:
  - This is a starter plugin intended for local testing.
  - It creates a View Template named "Rich Autocomplete Search".
  - The rendered client JS calls a plugin route that returns JSON suggestions.
*/

const Router = require("express-promise-router");
const db = require("@saltcorn/data/db");
const Table = require("@saltcorn/data/models/table");
const Form = require("@saltcorn/data/models/form");
const { input, div, script, style, a, i } = require("@saltcorn/markup/tags");
const Workflow = require("@saltcorn/data/models/workflow");
const plugin_name = "saltcorn-rich-autocomplete";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeIdent(name) {
  if (!name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Unsafe SQL identifier: ${name}`);
  }
  return name;
}

function makeLink(pattern, row) {
  let out = pattern || "/";
  Object.entries(row).forEach(([k, v]) => {
    const val = encodeURIComponent(v ?? "");
    out = out.replaceAll(`{{${k}}}`, val);
  });
  return out;
}

async function richSearch(req, res) {
  const tableName = safeIdent(req.query.table);
  const searchField = safeIdent(req.query.search_field);
  const titleField = safeIdent(req.query.title_field || searchField);
  const thumbField = req.query.thumb_field ? safeIdent(req.query.thumb_field) : null;
  const subtitleField = req.query.subtitle_field ? safeIdent(req.query.subtitle_field) : null;
  const metaField = req.query.meta_field ? safeIdent(req.query.meta_field) : null;
  const linkPattern = req.query.link_pattern || "/";
  const limit = Math.min(Math.max(parseInt(req.query.limit || "8", 10), 1), 25);
  const q = String(req.query.q || "").trim();

  if (q.length < 1) return res.json({ results: [] });

  const fields = ["id", titleField, searchField, thumbField, subtitleField, metaField]
    .filter(Boolean)
    .filter((v, ix, arr) => arr.indexOf(v) === ix);

  // Use lower(field) LIKE lower($1) for PostgreSQL/SQLite friendliness.
  const selectList = fields.map((f) => `"${f}"`).join(", ");
  const sql = `select ${selectList} from "${tableName}"
    where lower(cast("${searchField}" as text)) like lower($1)
    order by "${titleField}" asc
    limit ${limit}`;

  const rows = await db.query(sql, [`%${q}%`]);
  const actualRows = rows.rows || rows;

  const results = actualRows.map((row) => ({
    title: row[titleField] ?? "",
    thumbnail: thumbField ? row[thumbField] : "",
    subtitle: subtitleField ? row[subtitleField] : "",
    meta: metaField ? row[metaField] : "",
    url: makeLink(linkPattern, row),
  }));

  res.json({ results });
}

const routes = (() => {
  const router = Router();
  router.get("/search", richSearch);
  return router;
})();

function configuration_workflow() {
  return new Workflow({
    steps: [
      {
        name: "Search settings",
        form: async () =>
          new Form({
            fields: [
              { name: "table_name", label: "Table name", type: "String", required: true, default: "videos" },
              { name: "search_field", label: "Field to search", type: "String", required: true, default: "title" },
              { name: "title_field", label: "Title field", type: "String", required: true, default: "title" },
              { name: "thumb_field", label: "Thumbnail/image field", type: "String", default: "poster_image" },
              { name: "subtitle_field", label: "Subtitle field", type: "String" },
              { name: "meta_field", label: "Meta field", type: "String", default: "avg_rounded" },
              { name: "link_pattern", label: "Link pattern", type: "String", required: true, default: "/page/stage?id={{id}}" },
              { name: "placeholder", label: "Placeholder", type: "String", default: "Search..." },
              { name: "result_limit", label: "Result limit", type: "Integer", default: 8 },
              { name: "min_chars", label: "Minimum characters before search", type: "Integer", default: 2 }
            ]
          })
      }
    ]
  });
}

const richAutocompleteView = {
  name: "Rich Autocomplete Search",
  display_state_form: false,
  configuration_workflow: configuration_workflow,
  run: async (table_id, viewname, cfg) => {
    const id = `sc-rich-search-${Math.random().toString(36).slice(2)}`;
    const tableName = esc(cfg.table_name || "");
    const searchField = esc(cfg.search_field || "");
    const titleField = esc(cfg.title_field || cfg.search_field || "");
    const thumbField = esc(cfg.thumb_field || "");
    const subtitleField = esc(cfg.subtitle_field || "");
    const metaField = esc(cfg.meta_field || "");
    const linkPattern = esc(cfg.link_pattern || "/page/stage?id={{id}}");
    const limit = Number(cfg.result_limit || 8);
    const minChars = Number(cfg.min_chars || 2);
    const placeholder = esc(cfg.placeholder || "Search...");

    return div({ class: "sc-rich-autocomplete", id },
      input({ class: "form-control sc-rich-autocomplete-input", type: "search", placeholder, autocomplete: "off" }),
      div({ class: "sc-rich-autocomplete-results shadow-sm" }),
      style(`
        #${id}{position:relative;max-width:720px;width:100%;}
        #${id} .sc-rich-autocomplete-results{display:none;position:absolute;z-index:9999;top:100%;left:0;right:0;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:.6rem;margin-top:.25rem;overflow:hidden;}
        #${id} .sc-rich-item{display:flex;gap:.75rem;align-items:center;padding:.55rem .7rem;text-decoration:none;color:inherit;border-bottom:1px solid rgba(0,0,0,.06);}
        #${id} .sc-rich-item:hover,#${id} .sc-rich-item.active{background:rgba(0,0,0,.055);text-decoration:none;}
        #${id} .sc-rich-thumb{width:64px;height:42px;object-fit:cover;border-radius:.35rem;background:#e9ecef;flex:0 0 auto;}
        #${id} .sc-rich-title{font-weight:600;line-height:1.2;}
        #${id} .sc-rich-subtitle,#${id} .sc-rich-meta{font-size:.85rem;opacity:.72;line-height:1.2;margin-top:.15rem;}
        #${id} .sc-rich-empty{padding:.7rem;opacity:.7;}
      `),
      script(`
        (function(){
          const root = document.getElementById(${JSON.stringify(id)});
          if(!root) return;
          const input = root.querySelector('.sc-rich-autocomplete-input');
          const box = root.querySelector('.sc-rich-autocomplete-results');
          let timer = null;
          let last = '';
          const minChars = ${JSON.stringify(minChars)};
          const endpoint = "/plugins/saltcorn-rich-autocomplete/search";
          const params = new URLSearchParams({
            table: ${JSON.stringify(tableName)},
            search_field: ${JSON.stringify(searchField)},
            title_field: ${JSON.stringify(titleField)},
            thumb_field: ${JSON.stringify(thumbField)},
            subtitle_field: ${JSON.stringify(subtitleField)},
            meta_field: ${JSON.stringify(metaField)},
            link_pattern: ${JSON.stringify(linkPattern)},
            limit: ${JSON.stringify(String(limit))}
          });
          function htmlEscape(s){return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
          function render(results){
            if(!results || !results.length){ box.innerHTML = '<div class="sc-rich-empty">No matches</div>'; box.style.display='block'; return; }
            box.innerHTML = results.map(r => {
              const img = r.thumbnail ? '<img class="sc-rich-thumb" src="'+htmlEscape(r.thumbnail)+'" alt="">' : '<div class="sc-rich-thumb"></div>';
              return '<a class="sc-rich-item" href="'+htmlEscape(r.url)+'">'+img+'<div class="sc-rich-text"><div class="sc-rich-title">'+htmlEscape(r.title)+'</div>'+(r.subtitle?'<div class="sc-rich-subtitle">'+htmlEscape(r.subtitle)+'</div>':'')+(r.meta?'<div class="sc-rich-meta">'+htmlEscape(r.meta)+'</div>':'')+'</div></a>';
            }).join('');
            box.style.display='block';
          }
          async function searchNow(){
            const q = input.value.trim();
            if(q.length < minChars){ box.style.display='none'; return; }
            if(q === last) return;
            last = q;
            const url = endpoint + '?' + params.toString() + '&q=' + encodeURIComponent(q);
            try{
              const resp = await fetch(url, {headers:{'Accept':'application/json'}});
              const data = await resp.json();
              render(data.results || []);
            } catch(e){
              box.innerHTML = '<div class="sc-rich-empty">Search error</div>'; box.style.display='block';
              console.error('Rich autocomplete search error', e);
            }
          }
          input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(searchNow, 180); });
          input.addEventListener('focus', () => { if(box.innerHTML) box.style.display='block'; });
          document.addEventListener('click', (e) => { if(!root.contains(e.target)) box.style.display='none'; });
          input.addEventListener('keydown', (e) => {
            if(e.key === 'Escape') box.style.display='none';
            if(e.key === 'Enter'){
              const first = box.querySelector('.sc-rich-item');
              if(first){ e.preventDefault(); window.location = first.href; }
            }
          });
        })();
      `)
    );
  }
};

module.exports = {
  sc_plugin_api_version: 1,
  plugin_name,
  viewtemplates: [richAutocompleteView],
  routes: [{ prefix: "/search", router: routes }]
};

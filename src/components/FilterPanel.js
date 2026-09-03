// src/components/FilterPanel.js
import { loadJSON, resolveAsset } from '../core/dataLoader.js';
import { createEmptyFilterState, toggleFilterOption, countActiveFilters } from '../modules/cardFilter.js';
import { renderTagList } from './TagPicker.js';

/**
 * Builds a filter panel bound to filter-schema.json.
 * @param {HTMLElement} container
 * @param {(state: Object) => void} onChange - called with the new filter state whenever it changes
 * @returns {Promise<{ getState: () => Object, reset: () => void, schema: Array, cdRanges: Array }>}
 */
export async function mountFilterPanel(container, onChange) {
  const schema = await loadJSON('data/filter-schema.json');
  const sourcesCache = {};
  for (const group of schema) {
    sourcesCache[group.field] = await loadJSON(group.source);
  }
  let state = createEmptyFilterState(schema);

  function render() {
    // container itself is the scrolling element (.fg-sidebar has its own
    // overflow-y:auto) — wiping and rebuilding its children on every
    // single option click was resetting its scrollTop to 0 each time,
    // which is what was jumping the whole filter list back to the top
    // instead of staying where you clicked.
    const scrollTop = container.scrollTop;
    container.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'filter-panel';

    for (const group of schema) {
      const wrap = document.createElement('div');
      wrap.className = 'filter-group';

      const label = document.createElement('div');
      label.className = 'filter-group-label';
      label.textContent = group.label;
      wrap.appendChild(label);

      const optionsWrap = document.createElement('div');
      optionsWrap.className = 'filter-options';

      const options = sourcesCache[group.field];
      if (group.optionType === 'icon-multi') {
        renderTagList(optionsWrap, options, {
          isActive: (option) => (state[group.field] || []).includes(option.id),
          onToggle: (option) => {
            state = toggleFilterOption(state, group.field, option.id);
            render();
            onChange(state);
          },
        });
      } else {
        for (const option of options) {
          optionsWrap.appendChild(renderOption(group, option));
        }
      }
      wrap.appendChild(optionsWrap);
      panel.appendChild(wrap);
    }

    const footer = document.createElement('div');
    footer.className = 'filter-panel-footer';
    const count = document.createElement('span');
    count.className = 'filter-count';
    const active = countActiveFilters(state);
    count.textContent = active > 0 ? `已套用 ${active} 項篩選條件` : '尚未套用篩選條件';
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn btn-sm btn-secondary';
    clearBtn.textContent = '清除全部';
    clearBtn.disabled = active === 0;
    clearBtn.addEventListener('click', () => {
      state = createEmptyFilterState(schema);
      render();
      onChange(state);
    });
    footer.append(count, clearBtn);
    panel.appendChild(footer);

    container.appendChild(panel);
    container.scrollTop = scrollTop;
  }

  function renderOption(group, option) {
    const selectedList = state[group.field] || [];
    const isActive = selectedList.includes(option.id);
    let el;

    if (group.optionType === 'badge') {
      el = document.createElement('button');
      el.type = 'button';
      el.className = 'opt-badge' + (isActive ? ' active' : '');
      el.textContent = option.label;
      if (isActive) el.style.background = option.color;
      if (isActive) el.style.borderColor = option.color;
      if (isActive) el.style.color = '#14131f';
    } else if (group.optionType === 'range') {
      el = document.createElement('button');
      el.type = 'button';
      el.className = 'opt-range' + (isActive ? ' active' : '');
      el.textContent = option.label;
    } else if (group.optionType === 'avatar') {
      el = document.createElement('button');
      el.type = 'button';
      el.className = 'opt-avatar' + (isActive ? ' active' : '');
      el.title = option.name;
      el.setAttribute('aria-label', option.name);
      const img = document.createElement('img');
      img.src = resolveAsset(option.icon);
      img.alt = option.name;
      el.appendChild(img);
    } else {
      // icon (class / element single-value)
      el = document.createElement('button');
      el.type = 'button';
      el.className = 'opt-icon' + (isActive ? ' active' : '');
      el.title = option.label;
      el.setAttribute('aria-label', option.label);
      const img = document.createElement('img');
      img.src = resolveAsset(option.icon);
      img.alt = option.label;
      el.appendChild(img);
    }

    el.setAttribute('aria-pressed', String(isActive));
    el.addEventListener('click', () => {
      state = toggleFilterOption(state, group.field, option.id);
      render();
      onChange(state);
    });
    return el;
  }

  render();

  return {
    getState: () => state,
    reset: () => { state = createEmptyFilterState(schema); render(); onChange(state); },
    schema,
    cdRanges: sourcesCache.cd,
  };
}

// src/components/TeamEditor.js
import { openModal } from './Modal.js';
import { openCardPicker } from './CardPicker.js';
import { renderCardButton } from './CardButton.js';
import { loadJSON, DataSources } from '../core/dataLoader.js';
import { saveTeam, TEAM_MEMBER_SLOTS } from '../core/store.js';
import { showToast } from '../core/toast.js';

/**
 * Opens the team editor modal for a stage. Resolves with the saved team,
 * or null if the user cancelled.
 * @param {string} stageId
 * @param {Object|null} existingTeam - pass null to create a new team
 */
export function openTeamEditor(stageId, existingTeam = null) {
  return new Promise(async (resolve) => {
    const [cards, rarities, elements, classes] = await Promise.all([
      loadJSON(DataSources.cards),
      loadJSON(DataSources.rarities),
      loadJSON(DataSources.elements),
      loadJSON(DataSources.classes),
    ]);
    const cardMap = new Map(cards.map((c) => [c.id, c]));
    // Same maps CardButton/CardGrid use everywhere else, so a slot here
    // (屬性/定位/稀有度 badges, same proportions) looks identical to the
    // card as it appears in 卡片資料庫 or the card picker grid below it.
    const cardMaps = {
      rarityMap: new Map(rarities.map((r) => [r.id, r])),
      elementMap: new Map(elements.map((e) => [e.id, e])),
      classMap: new Map(classes.map((c) => [c.id, c])),
    };

    let members = existingTeam
      ? [...existingTeam.members]
      : Array(TEAM_MEMBER_SLOTS).fill(null);
    while (members.length < TEAM_MEMBER_SLOTS) members.push(null);

    const body = document.createElement('div');

    const nameField = document.createElement('div');
    nameField.className = 'form-field';
    nameField.innerHTML = '<label for="team-name-input">隊伍名稱</label>';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'team-name-input';
    nameInput.maxLength = 30;
    nameInput.value = existingTeam ? existingTeam.name : '';
    nameInput.placeholder = '例如：高分隊';
    nameField.appendChild(nameInput);

    const noteField = document.createElement('div');
    noteField.className = 'form-field';
    noteField.innerHTML = '<label for="team-note-input">備註</label>';
    const noteInput = document.createElement('textarea');
    noteInput.id = 'team-note-input';
    noteInput.maxLength = 300;
    noteInput.rows = 3;
    noteInput.placeholder = '例如：第三回合保留大招。';
    noteInput.value = existingTeam ? existingTeam.note || '' : '';
    const noteHint = document.createElement('div');
    noteHint.className = 'form-hint';
    noteHint.textContent = '換行會保留原本的排版。';
    noteField.append(noteInput, noteHint);

    const slotsLabel = document.createElement('div');
    slotsLabel.className = 'form-field';
    slotsLabel.innerHTML = '<label>隊員</label>';
    const slots = document.createElement('div');
    slots.className = 'team-slots';
    slotsLabel.appendChild(slots);

    body.append(nameField, noteField, slotsLabel);

    function renderSlots() {
      slots.innerHTML = '';
      members.forEach((cardId, index) => {
        const card = cardId ? cardMap.get(cardId) : null;
        const slotWrap = document.createElement('div');
        slotWrap.className = 'team-slot-btn';

        if (card) {
          const btn = renderCardButton(card, cardMaps, {
            onClick: async () => {
              const chosen = await openCardPicker({ excludeIds: members.filter((id, i) => id && i !== index) });
              if (chosen) {
                members[index] = chosen.id;
                renderSlots();
              }
            },
          });
          btn.style.width = '100%';
          slotWrap.appendChild(btn);

          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'btn btn-sm btn-secondary btn-block';
          removeBtn.style.marginTop = '4px';
          removeBtn.textContent = '移除';
          removeBtn.addEventListener('click', () => {
            members[index] = null;
            renderSlots();
          });
          slotWrap.appendChild(removeBtn);
        } else {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'card-empty-slot';
          btn.setAttribute('aria-label', `選擇第 ${index + 1} 位隊員`);
          btn.textContent = '+';
          btn.addEventListener('click', async () => {
            const chosen = await openCardPicker({ excludeIds: members.filter(Boolean) });
            if (chosen) {
              members[index] = chosen.id;
              renderSlots();
            }
          });
          slotWrap.appendChild(btn);
        }

        const label = document.createElement('div');
        label.className = 'team-slot-label';
        label.textContent = `隊員 ${index + 1}`;
        slotWrap.appendChild(label);

        slots.appendChild(slotWrap);
      });
    }
    renderSlots();

    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn';
    cancelBtn.textContent = '取消';
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = '儲存';
    footer.append(cancelBtn, saveBtn);
    body.appendChild(footer);

    let settled = false;
    const { close } = openModal({
      title: existingTeam ? '修改隊伍' : '新增隊伍',
      body,
      wide: true,
      onClose: () => { if (!settled) resolve(null); },
    });

    cancelBtn.addEventListener('click', () => { settled = true; close(); resolve(null); });

    saveBtn.addEventListener('click', async () => {
      if (!nameInput.value.trim()) {
        showToast('請輸入隊伍名稱', { type: 'error' });
        nameInput.focus();
        return;
      }
      try {
        const saved = await saveTeam(stageId, {
          localId: existingTeam ? existingTeam.localId : undefined,
          name: nameInput.value,
          note: noteInput.value,
          members,
        });
        settled = true;
        close();
        showToast('隊伍已儲存');
        resolve(saved);
      } catch (err) {
        showToast(err.message || '儲存失敗', { type: 'error' });
      }
    });
  });
}

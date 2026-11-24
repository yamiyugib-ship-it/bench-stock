import { apiBaseUrl } from './config.js';

const addForm = document.querySelector('#add-form');
const addButton = addForm.querySelector('button');
const adjustForm = document.querySelector('#adjust-form');
const saveButton = adjustForm.querySelector('[type="submit"]');
const dialog = document.querySelector('#adjust-dialog');
const cancelButton = document.querySelector('#cancel');
const adjustError = document.querySelector('#adjust-error');
const table = document.querySelector('#supply-table');
const tableBody = document.querySelector('#supply-list');
const count = document.querySelector('#supply-count');
const inventoryState = document.querySelector('#inventory-state');
const retryButton = document.querySelector('#retry');
const notice = document.querySelector('#notice');
const formatNumber = new Intl.NumberFormat();

let supplies = [];
let selectedSupply;

async function request(path, body) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/api${path}`, body === undefined ? {} : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Could not connect to the inventory. Please try again.');
  }

  const result = await response.json().catch(() => null);
  if (!response.ok || result === null) {
    throw new Error(result?.error ?? 'The inventory is temporarily unavailable. Please try again.');
  }
  return result;
}

function showNotice(message = '', isError = false) {
  notice.textContent = message;
  notice.classList.toggle('error', isError);
}

function openAdjustment(supply) {
  selectedSupply = supply;
  adjustForm.reset();
  adjustError.textContent = '';
  document.querySelector('#adjust-item').textContent = `${supply.name} · ${formatNumber.format(supply.quantity)} in stock`;
  dialog.showModal();
}

function renderInventory() {
  tableBody.replaceChildren();

  for (const supply of supplies) {
    const row = tableBody.insertRow();
    row.insertCell().textContent = supply.name;
    row.insertCell().textContent = formatNumber.format(supply.quantity);

    const adjustButton = document.createElement('button');
    adjustButton.className = 'secondary';
    adjustButton.type = 'button';
    adjustButton.textContent = 'Adjust';
    adjustButton.dataset.supply = supply.id;
    adjustButton.setAttribute('aria-label', `Adjust stock for ${supply.name}`);
    adjustButton.addEventListener('click', () => openAdjustment(supply));
    row.insertCell().append(adjustButton);
  }

  table.hidden = supplies.length === 0;
  inventoryState.hidden = supplies.length > 0;
  inventoryState.textContent = 'No supplies yet. Add your first supply to get started.';
  count.hidden = false;
  count.textContent = formatNumber.format(supplies.length);
}

async function loadInventory() {
  retryButton.hidden = true;
  addButton.disabled = true;
  inventoryState.textContent = 'Loading inventory…';
  try {
    supplies = await request('/supplies');
    renderInventory();
    addButton.disabled = false;
  } catch (error) {
    inventoryState.textContent = error.message;
    retryButton.hidden = false;
  }
}

addForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  addButton.disabled = true;
  showNotice();
  try {
    const supply = await request('/supplies', {
      name: addForm.elements.name.value,
      quantity: addForm.elements.quantity.valueAsNumber,
    });
    supplies.push(supply);
    supplies.sort((first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: 'base' }));
    renderInventory();
    addForm.reset();
    showNotice(`Added ${supply.name}.`);
  } catch (error) {
    showNotice(error.message, true);
  } finally {
    addButton.disabled = false;
    addForm.elements.name.focus();
  }
});

adjustForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  cancelButton.disabled = true;
  adjustError.textContent = '';
  try {
    const updated = await request(`/supplies/${selectedSupply.id}/adjustments`, {
      direction: adjustForm.elements.direction.value,
      amount: adjustForm.elements.amount.valueAsNumber,
    });
    supplies = supplies.map((supply) => supply.id === updated.id ? updated : supply);
    dialog.close();
    renderInventory();
    tableBody.querySelector(`[data-supply="${updated.id}"]`).focus();
    showNotice(`Updated ${updated.name}.`);
  } catch (error) {
    adjustError.textContent = error.message;
    adjustForm.elements.amount.focus();
  } finally {
    saveButton.disabled = false;
    cancelButton.disabled = false;
  }
});

cancelButton.addEventListener('click', () => dialog.close());
dialog.addEventListener('cancel', (event) => {
  if (saveButton.disabled) event.preventDefault();
});
retryButton.addEventListener('click', loadInventory);
loadInventory();

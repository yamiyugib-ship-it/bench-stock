import { createInventoryRepository } from './inventory-repository.js';

const maximumQuantity = 999999;

function requestError(status, message) {
  return Object.assign(new Error(message), { status });
}

function isQuantity(value, minimum) {
  return Number.isInteger(value) && value >= minimum && value <= maximumQuantity;
}

export function createInventoryService(database) {
  const repository = createInventoryRepository(database);

  return {
    list: repository.list,

    async create(body) {
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      const quantity = body?.quantity;
      if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
        throw requestError(400, 'Enter a supply name between 1 and 80 characters on one line.');
      }
      if (!isQuantity(quantity, 0)) {
        throw requestError(400, 'Starting quantity must be a whole number from 0 to 999,999.');
      }

      const supply = await repository.create(name, quantity);
      if (!supply) throw requestError(409, 'A supply with that name already exists.');
      return supply;
    },

    async adjust(rawId, body) {
      const id = Number(rawId);
      if (!/^\d+$/.test(rawId) || id < 1 || id > 2147483647) {
        throw requestError(400, 'Invalid supply ID.');
      }

      const { direction, amount } = body ?? {};
      if (direction !== 'in' && direction !== 'out') {
        throw requestError(400, 'Choose stock in or stock out.');
      }
      if (!isQuantity(amount, 1)) {
        throw requestError(400, 'Amount must be a whole number from 1 to 999,999.');
      }

      const change = direction === 'in' ? amount : -amount;
      const supply = await repository.adjust(id, change, maximumQuantity);
      if (supply) return supply;

      if (!(await repository.exists(id))) throw requestError(404, 'Supply not found.');
      throw requestError(409, direction === 'out' ? 'There is not enough stock.' : 'Stock cannot exceed 999,999 units.');
    },
  };
}

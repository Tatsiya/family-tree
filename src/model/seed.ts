import type { Tree } from './types'

export const SEED_TREE: Tree = {
  rootPersonId: 'p_1',
  persons: {
    'p_1': {
      id: 'p_1',
      name: 'Анна',
      middleName: 'Ивановна',
      lastName: 'Иванова',
      dateOfBirth: '1990-05-14',
      placeOfBirth: 'Минск',
    }
  },
  families: {}
}
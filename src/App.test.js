import { buildUsageRows } from './App';

describe('buildUsageRows', () => {
  it('flattens daily API usage into date and endpoint rows', () => {
    const usage = {
      data: {
        total: {
          '/api/v3/(ip_addresses)': 4,
        },
        daily: {
          '2026-08-11': {},
          '2026-08-12': {
            '/api/v3/(ip_addresses)': 4,
          },
          '2026-08-13': {},
        },
      },
    };

    expect(buildUsageRows(usage)).toEqual([
      { date: '2026-08-11', endpoint: 'No activity', usage: 0 },
      { date: '2026-08-12', endpoint: '/api/v3/(ip_addresses)', usage: 4 },
      { date: '2026-08-13', endpoint: 'No activity', usage: 0 },
    ]);
  });
});

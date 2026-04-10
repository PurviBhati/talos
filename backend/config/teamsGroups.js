// Teams Groups Configuration
// Using actual monitored chat IDs from the environment

export const TEAMS_GROUPS = [
  {
    id: '19:242493be18a54cb58c65303932eeeb7f@thread.v2', // BuildBite chat ID
    name: 'BuildBite',
    displayName: 'BuildBite',
    description: 'BuildBite development team'
  },
  {
    id: '19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2', // Avishkar chat ID
    name: 'Avishkar',
    displayName: 'Avishkar', 
    description: 'Avishkar project team'
  },
  {
    id: '19:b8106b41b4eb4b4289f0add58655fbca@thread.v2', // PeloTech chat ID
    name: 'PeloTech',
    displayName: 'PeloTech',
    description: 'PeloTech development team'
  },
  {
    id: '19:c674dec86329409aac6054bdc2c986e4@thread.v2', // Ignite chat ID
    name: 'Ignite',
    displayName: 'Ignite',
    description: 'Ignite project team'
  },
  {
    id: '19:8fc98a7687624b4abd4c2ecb84a58be9@thread.v2', // Deep Grp chat ID
    name: 'Deep Grp',
    displayName: 'Deep Grp',
    description: 'Deep group team'
  },
  {
    id: '19:f92996ccf45c4e3e92d539c0603a2953@thread.v2', // Atmonica chat ID
    name: 'Atmonica',
    displayName: 'Atmonica',
    description: 'Atmonica development team'
  },
  {
    id: '19:48c5728ce97b469fb657a8924c15244c@thread.v2',
    name: 'Neuramonks',
    displayName: 'Neuramonks',
    description: 'Neuramonks — Website neuramonks (WhatsApp)'
  }
];

// Helper function to get team by name
export function getTeamByName(name) {
  return TEAMS_GROUPS.find(team => 
    team.name.toLowerCase() === name.toLowerCase() ||
    team.displayName.toLowerCase() === name.toLowerCase()
  );
}

// Helper function to get team by ID
export function getTeamById(id) {
  return TEAMS_GROUPS.find(team => team.id === id);
}

/*
TEAMS GROUPS CONFIGURED:
✅ BuildBite - 19:242493be18a54cb58c65303932eeeb7f@thread.v2
✅ Avishkar - 19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2  
✅ PeloTech - 19:b8106b41b4eb4b4289f0add58655fbca@thread.v2
✅ Ignite - 19:c674dec86329409aac6054bdc2c986e4@thread.v2
✅ Deep Grp - 19:8fc98a7687624b4abd4c2ecb84a58be9@thread.v2
✅ Atmonic - 19:f92996ccf45c4e3e92d539c0603a2953@thread.v2
✅ Neuramonks - 19:48c5728ce97b469fb657a8924c15244c@thread.v2

These are the actual monitored chat IDs from your environment.
All 6 groups are now properly configured for bidirectional messaging.
*/
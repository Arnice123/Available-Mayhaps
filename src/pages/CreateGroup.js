import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CreateGroup() {
  const [name, setName] = useState('');
  const router = useNavigate();

  async function handleCreateGroup(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await fetch('/api/groups/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/group/${data.groupId}`);
    }
  }

  return (
    <form onSubmit={handleCreateGroup}>
      <h1>Create Group</h1>
      <input placeholder="Group Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <button type="submit">Create</button>
    </form>
  );
}

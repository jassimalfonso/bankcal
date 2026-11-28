import { test } from 'node:test'
import assert from 'node:assert/strict'
import { listPeople, ownersOf, wipePerson } from '../api/admin.js'

test('owners come from a comma or space separated list', () => {
  assert.deepEqual(ownersOf(' A@x.com, b@x.com;c@x.com '), ['a@x.com', 'b@x.com', 'c@x.com'])
  assert.deepEqual(ownersOf(undefined), [])
})
test('listPeople joins sign-ins with app names, newest first', async () => {
  const call = async (url) => url.includes('accounts:batchGet')
    ? { users: [{ localId: 'u1aaaaaaaaaa', email: 'Me@x.com', displayName: 'Me Real', createdAt: '100', lastLoginAt: '900' }, { localId: 'u2bbbbbbbbbb', email: 'friend@x.com', createdAt: '500', disabled: true }] }
    : { documents: [{ name: 'projects/p/databases/(default)/documents/users/u1aaaaaaaaaa', fields: { name: { stringValue: 'Fart Monster' } } }] }
  const people = await listPeople(call, ['me@x.com'])
  assert.deepEqual(people.map((p) => [p.uid, p.name, p.owner, p.blocked, p.setUp]), [['u2bbbbbbbbbb', '', false, true, false], ['u1aaaaaaaaaa', 'Fart Monster', true, false, true]])
})
test('wipePerson deletes every entry in pages, then the profile and share', async () => {
  const calls = []
  let pages = [[{ name: 'e1' }, { name: 'e2' }], [{ name: 'e3' }], []]
  const call = async (url, post) => { calls.push([url.split('/documents')[1], post]); return post ? {} : { documents: pages.shift() } }
  await wipePerson(call, 'u2bbbbbbbbbb')
  const commits = calls.filter(([, p]) => p).map(([, p]) => p.writes.map((w) => w.delete.split('/documents/').pop()))
  assert.deepEqual(commits, [['e1', 'e2'], ['e3'], ['users/u2bbbbbbbbbb', 'shares/u2bbbbbbbbbb']])
})

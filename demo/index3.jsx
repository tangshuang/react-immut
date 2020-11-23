import React from 'react'
import { combineStore } from '../src/index.js'
import * as some from './some/some.store.js'

const { useSome } = combineStore({
  some,
})

export default function App() {
  return (
    <div className="container">
      <div className="header">Person</div>
      <Person />
      <br />
      <Editor />
    </div>
  )
}

function Person() {
  const [some] = useSome()
  return <span>{some.name}: {some.age}</span>
}

function Editor() {
  const [{ age, name }, { changeName, changeAge }] = useSome()
  const names = ['Jimy', 'Tomy', 'Lucy', 'Dohpi']
  return (
    <>
      <button onClick={() => changeName(names[names.indexOf(name) + 1] || 'Tom')}>change name</button>
      <button onClick={() => changeAge(age + 1)}>change age</button>
    </>
  )
}

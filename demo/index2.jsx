import React from 'react'
import { Provider, useStore, createStore } from '../src/index.js'
import * as some from './some/some.store.js'

const store = createStore(null, {
  some,
})

export default function App() {
  return (
    <Provider store={store}>
      <div className="container">
        <div className="header">Person</div>
        <Person />
        <br />
        <Editor />
      </div>
    </Provider>
  )
}

function Person() {
  const [some] = useStore('some')
  return <span>{some.name}: {some.age}</span>
}

function Editor() {
  const [_, { changeName, changeAge }] = useStore('some')
  return (
    <>
      <button onClick={() => changeName(['Jimy', 'Tomy'][+new Date() % 2])}>change name</button>
      <button onClick={() => changeAge([20, 30][+new Date() % 2])}>change age</button>
    </>
  )
}

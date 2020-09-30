<h1 align="center"><a href="https://github.com/tangshuang/react-immut"><img src="react-immut.png" alt="react-immut" width="120" height="120"/></a></h1>
<p align="center">The world's easiest react global state manangement.</p>

<br />
<br />
<br />

<p align="center"><a href="https://github.com/tangshuang/jqvm"><img src="https://camo.githubusercontent.com/3b69fdf3e874a6cc64012c5a1a858767155a95d9/687474703a2f2f72616e646f6a732e636f6d2f696d616765732f64726f70536861646f772e706e67" width="100%"/></a></p>

<br />
<br />
<br />
<br />

## :hear_no_evil:  What's all the react-immut?

React global state management is a big topic in development. I like immutable characteristics, but I don't like the operation of getting immutable data. Luckly, [immer](https://github.com/immerjs/immer) give us a way to get immutable data very easy. Based on immer, I create react-immut to manage our global state in react applications.
React-immut is a easy, lightweight and trending react global state manager, after you try it in 10 seconds, I belive, you will like it.

## :rocket: Install

```
npm i react-immut
```

## :package: Usage

```js
import { useStore } from 'react-immut'

function MyComponent() {
  const [state, dispatch] = useStore()
  return <button onClick={() => dispatch(state => { state.some = 'new' })}>{state.some}</button>
}
```

## :beers: useStore(keyPath)

If you do not pass `keyPath`, you will get the whole state and dispatch which operate the whole state.

```js
function MyComponent() {
  const [state, dispatch] = useStore()

  const changeName = () => {
    dispatch(state => {
      // state is a draft of whole global state
      state.name = 'tomy'
    })
  }
}
```

If you pass a `keyPath`, you will get the scoped state and dispatch which operate the target state node.

```js
function MyComponent() {
  const [book, dispatchBook] = useStore('books[0]')

  const changeName = () => {
    dispatchBook(book => {
      // book is a part of whole global state, which is read from state.books[0]
      book.price = 12.5
    })
  }
}
```

## :loud_sound: dispatch(keyPath?, update)

To change state, you will use `dispatch`. It receive two parameters:

```ts
dispatch(keyPath?: string|array, update: function|any)
```

- `keyPath` is optional, it means which state (should must be an object) node you want to change.
- `update` is a function, which receives the state (or picked node) to be modified and returns the new value

```js
// replace the whole state
dispatch({ ... })

// replace books[0] scoped state
dispatch('books[0]', { ... })

// use a function to modify the whole state
dispatch(state => {
  state.name = 'New Name'
})

// use a function to modify the scoped state
dispatch('books[0]', book => {
  book.name = 'New Name'
})

// with return value
dispatch(state => {
  return {
    ...state,
    name: 'New Name',
  }
})
dispatch('books[0].name', name => {
  return 'New Name'
})
```

Learn more about the deep knowledge from [immer](https://github.com/immerjs/immer).

## :school: Typical Usage

```js
import { createStore, Provider, connect } from 'react-immut'

// Step 1: create a store
const store = createStore({ name: 'Tom' })

// Step 2: wrap with Provider
function App() {
  return (
    <Provider store={store}>
      <div>title</div>
      <MyComponent />
    </Provider>
  )
}

// Step 3: use connect & mapStateToProps & mapDispatchToProps

const mapStateToProps = (state) => {
  const { name } = state
  return { name }
}

const mapDispatchToProps = (dispatch) => {
  const changeName = (newName) => {
    dispatch(state => state.name = newName)
  }
  return { changeName }
}

// Step 4: connect component
export default connect(mapStateToProps, mapDispatchToProps)(MyComponent)

function MyComponent(props) {
  const { name } = props
  return <span>{name}</span>
}
```

### :hamburger: Provider

```
<Provider store? context?>
```

When you did not pass a `store` and `context` it will use default built in store and context.

```jsx
<Provider>
  <App />
</Provider>
```

*Notice: `Provider` in react-immut is optional, you can use `useStore` or `connect` directly (using default global store).*

## :art: Combined Store

In many situations, developers want to split the whole state and put component's files tegother. We provide a way to implement this easily.

```js
// components/a-some/store.js

export const state = {
  name: 'Tom',
  age: 10,
}

export function changeName(dispatch, name) {
  dispatch(state => {
    state.name = name
  })
}

export function changeAge(dispatch, age) {
  dispatch(state => {
    state.age = age
  })
}
```

**:santa: use combine**

```
combine(namespaces, { store?, hooks? })
```

```js
import { combine } from 'react-immut'
import * as Asome from './components/a-some/store.js' // import this namespace as Asome (its name)

const { useAsome } = combine({
  Asome,
})

function MyComponent() {
  const [state, { changeName, changeAge }] = useAsome()
  // ...
  return <button onClick={() => {
    changeName('new name') // notice, we define changeName(dispatch,name) but use changeName(name)
  }}>change name</button>
}
```

`combine` register given namespaces into global store, and return hook functions to use namespaces.
Namespaces are registered into global state, so that you can reuse them again by using `useStore`:

```js
import { combine, useStore } from 'react-immut'

// here I do not receive the return hooks
combine({
  Aname: {
    state: {}
    fnA() {},
    fnB() {},
  },
  Bname: {
    state: {}
    fnA() {},
    fnB() {},
  },
})

function MyComponent() {
  const [{ name, age }, { changeName, changeAge }] = useStore('Asome') // namespace is registered before
  const [stateA, { fnA: A_fnA, fnB: A_fnB }] = useStore('Aname')
  const [stateB, { fnA: B_fnA, fnB: B_fnB }] = useStore('Bname')
  // ...

  return (
    <>
      <button onClick={() => changeName('new name')}>change name</button>
      <button onClick={() => changeAge(20)}>change age</button>
    </>
  )
}
```

**:pager: typical way createStore**

```js
// app.js

import { createStore } from 'react-immut'
import * as Asome from './components/a-some/store.js' // import this namespace as Asome (its name)

// set namespaces into the second parameter
// the first parameter should be an object or null
const store = createStore(null, {
  Asome,
})

export default function App() {
  return (
    <Provider store={store}>
      ...
    </Provider>
  )
}
```

`Asome` is a namespace, you can use this namespace in a component like this:

```js
// components/a-some/index.jsx

import { connect } from 'react-immut'

const mapStateToProps = (state) => {
  const { Asome } = state // use namespace as a property of state, the state properties are on it
  return { ...Asome }
}

const mapDispatchToProps = (dispatch) => {
  // here dispatch is a function, but defined dispatchers in store.js are patched on it
  const { Asome } = dispatch // use namespace as a property, the methods are on it
  return { ...Asome }
}

export default connect(mapStateToProps, mapDispatchToProps)(Asome)

function Asome(props) {
  const { name, age, changeName, changeAge } = props

  return (
    <>
      <button onClick={() => changeName('new name')}>change name</button>
      <button onClick={() => changeAge(20)}>change age</button>
    </>
  )
}
```

In the previous code block, we use `changeName('new name')` directly the parameter will be passed into defined `changeName` as the second parameter in `store.js`.

**:loudspeaker: combine**

```
combine(namespaces, { store?, hooks? })
```

```js
import { combine } from 'react-immut'

const { useAname, useBname } = combine({
  // named namespace
  Aname: {
    state: {}
    fnA() {},
    fnB() {},
  },
  // symbol namespace
  [Symbol('Bname')]: {
    state: {}
    fnA() {},
    fnB() {},
  },
})

function MyComponent() {
  const [stateA, { fnA: A_fnA, fnB: A_fnB }] = useAname()
  const [stateB, { fnA: B_fnA, fnB: B_fnB }] = useBname()
  // ...
}
```

`hooks` parameter default is `true`, if you set it to be `false`, you will get a `connect` function:

```js
const connect = combine({
  Aname: {
    state: {}
    fnA() {},
    fnB() {},
  },
  Bname: {
    state: {}
    fnA() {},
    fnB() {},
  },
}, {
  // store, // use you use a custom store, you should must pass this parameter
  hooks: false, // notice here
})

const mapStateToProps = (state) => {
  const { Aname, Bname } = state
  return {
    Aname,
    Bname,
  }
}

const mapDispatchToProps = (dispatch) => {
  const { Aname, Bname } = dispatch
  const { fnA: A_fnA, fnB: A_fnB } = Aname
  const { fnA: B_fnA, fnB: B_fnB } = Bname

  return {
    A_fnA,
    A_fnB,
    B_fnA,
    B_fnB,
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(MyComponent)

function MyComponent(props) {
  const {
    Aname,
    Bname,
    A_fnA,
    A_fnB,
    B_fnA,
    B_fnB,
  } = props
  // ...
}
```

Namespaces are registered into global state, you can reuse them again by using `useStore`:

```js
import { combine, useStore } from 'react-immut'

combine({
  Aname: {
    state: {}
    fnA() {},
    fnB() {},
  },
  Bname: {
    state: {}
    fnA() {},
    fnB() {},
  },
})

function MyComponent() {
  const [stateA, { fnA: A_fnA, fnB: A_fnB }] = useStore('Aname')
  const [stateB, { fnA: B_fnA, fnB: B_fnB }] = useStore('Bname')
  // ...
}
```

**:loop: async operation**

You can call dispatch directly when you can invoke dispatch.

```js
// components/a-some/store.js

export const state = {
  name: 'Tom',
  age: 10,
}

export function updateName(dispatch) {
  fetch(url).then(res => res.json()).then(data => dispatch(state => {
    const { name } = data
    state.name = name
  }))
}
```

```js
// components/my-component.jsx

function MyComponent() {
  const [{ name }, { updateName }] = useStore('Asome')
  // ..

  return <button onClick={updateName}>update name</button>
}
```

## :see_no_evil: License

MIT.

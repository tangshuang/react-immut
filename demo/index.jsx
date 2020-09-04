import React from 'react'
import { Store, Provider, connect, useStore } from '../src/index.js'

const store = new Store({
  todos: [
    { title: 'Title' },
  ],
})

export default function App() {
  return (
    <Provider store={store}>
      <div className="container">
        <div className="header">Todo List</div>
        <Todo />
        <Editor />
      </div>
    </Provider>
  )
}

function TodoList(props) {
  const { todos } = props
  return todos.map(todo => <div key={todo.title}>{todo.title}</div>)
}

function EditModal(props) {
  const [_, dispatch] = useStore('todos[0].title')

  const { changeTitle, addTodo } = props
  const change = () => {
    changeTitle(0, 'New Title')
  }
  const modify = () => {
    dispatch((todo) => {
      return 'Another Title'
    })
  }

  return (
    <>
      <button onClick={addTodo}>add</button>
      <button onClick={change}>change</button>
      <button onClick={modify}>modify</button>
    </>
  )
}

const mapStateToProps = (state, ownProps) => {
  const { todos } = state
  return {
    ...ownProps,
    todos,
  }
}

const mapDispatchToPorps = (dispatch) => {
  const changeTitle = (index, title) => {
    dispatch((state) => {
      state.todos[index].title = title
    })
  }
  const addTodo = () => {
    dispatch('todos', (todos) => {
      todos.push({ title: 'Title ' + todos.length })
    })
  }
  return { changeTitle, addTodo }
}

const Todo = connect(mapStateToProps)(TodoList)
const Editor = connect(null, mapDispatchToPorps)(EditModal)
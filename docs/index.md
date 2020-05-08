## demo

[demo](demo/)

## what


There are two views, a *top-level* view, and the view of an individual document. This app allows you to explore a hyperlinked graph (wiki) where an individual page in the wiki is structured according to a list/flowytree.

This is a [statechart](https://xstate.js.org/docs/#why) to help organize:

definition: <https://github.com/ohalmanacs/treacle/blob/master/viz-v0.0.8-machine.js>

(direct link to visualizer: <https://xstate.js.org/viz/?gist=f47c8de7e70a2b9f206cf8ad05a9bcf2>)
<iframe style="width: 47em; height: 35em;" src="https://xstate.js.org/viz/?gist=f47c8de7e70a2b9f206cf8ad05a9bcf2&embed=1"></iframe>

On the document view, there are navigation and editing actions:

 - `UP`
 - `DOWN`
 - `CREATE_ENTRY_BELOW`
 - `SAVE_NODE_ENTRY`

There's also a child state-machine that runs the editing of document titles.

## why

<blockquote><pre>
 statecharts = state-diagrams + depth
             + orthogonality + broadcast-communication
</pre></blockquote>

 - [Statecharts: A Visual Formalism for Complex Systems](http://www.inf.ed.ac.uk/teaching/courses/seoc/2005_2006/resources/statecharts.pdf)

See also: <https://statecharts.github.io/>


## chronology

the following is the sequence of statecharts presented in order chronologically.

### initial

There are two top-level states, **top** and **node**.

**node** is made up of a smaller system of states, **navigating** and **editing**.

definition: <https://github.com/ohalmanacs/treacle/blob/master/viz-initial-machine.js>

(direct link to visualizer: <https://xstate.js.org/viz/?gist=e29518dd3b0efe88ddaa6dbc753e1603&embed=1>)
<iframe style="width: 40em; height: 20em;" src="https://xstate.js.org/viz/?gist=e29518dd3b0efe88ddaa6dbc753e1603&embed=1"></iframe>

### v0.0.5

We take **top** and **node** and put them into a larger state, **flowiki**. This is so we can add events `NAVIGATE` and `GO_HOME` at this new top level.

definition: <https://github.com/ohalmanacs/treacle/blob/master/viz-v0.0.5-machine.js>

(direct link to visualizer: <https://xstate.js.org/viz/?gist=ea494e5af98690653566220e53ec8462&embed=1>)
<iframe style="width: 40em; height: 37em;" src="https://xstate.js.org/viz/?gist=ea494e5af98690653566220e53ec8462&embed=1"></iframe>

### v0.0.6

Inside **node**, we wrap **navigating** and **editing** inside a new, larger state node, **flowytree**.

We also add a new state, **nodeName**, which is parallel to **flowytree**. **nodeName** controls the editing state for the document name.

definition: <https://github.com/ohalmanacs/treacle/blob/master/viz-v0.0.6-machine.js>

(direct link to visualizer: <https://xstate.js.org/viz/?gist=f920db08e3da7fa6086264f68bd08828&embed=1>)
<iframe style="width: 42em; height: 55em;" src="https://xstate.js.org/viz/?gist=f920db08e3da7fa6086264f68bd08828&embed=1"></iframe>


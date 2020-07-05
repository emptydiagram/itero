<script>
  export let displayDocs, createDoc;

  import Header from './Header.svelte';

  import Icon from 'svelte-awesome';
  import { faPlus } from '@fortawesome/free-solid-svg-icons';
</script>

<style>
  #docsList {
    border-top: 1px solid #000;
    padding: 0;
    list-style-type: none;
  }

  #docsList li {
    padding: 0.5em 0;
    border-bottom: 1px solid #000;
  }
</style>

<Header isTop={true} />
<button on:click={createDoc}><Icon data={faPlus} scale="1" /></button>

<ul id="docsList">
  {#each displayDocs as doc}
    <li>
      <a href={'#/' + doc.id}>{doc.name}</a>
    </li>
  {/each}
</ul>

<script>
  import '../app.css' // Add global css (and make it hot reload)
  import logo from '$lib/assets/logo.svg'
  import logoDarkmode from '$lib/assets/logo-darkmode.svg'
  import { page } from '$app/stores'
  import { navigating } from '$app/stores'
  import { clickOutside } from '$lib/helpers/click-outside'

  /** @type {import('./$types').PageData} */
	export let data

  let showUsermenu = false

  const isActiveRoute = (route, currentRoute) => {
    if (currentRoute === route) return true
    if (route.length > 1 && currentRoute.substring(0, route.length) === route) return true
    return false
  }

  const getPathLinks = (path) => {
    const parts = path.split('/')
    const pathLinks = [
      {
        name: 'Hjem',
        href: '/',
        addSlashBefore: false
      }
    ]
    let currentLink = ''
    for (const part of parts) {
      if (part === '') continue
      currentLink += `/${part}`
      pathLinks.push({
        name: part,
        href: currentLink,
        addSlashBefore: true
      })
    }
    return pathLinks
  }

  const sideMenuItems = [
    {
      title: 'Hjem',
      href: '/',
      icon: 'home'
    },
    {
      title: 'Elever',
      href: '/elever',
      icon: 'person'
    },
    {
      title: 'Klasser',
      href: '/klasser',
      icon: 'group'
    }
  ]

  if (data.user.hasAdminRole) {
    sideMenuItems.push({
      title: 'Admin',
      href: '/admin',
      icon: 'settings'
    })
  }

  const getAvailableRoles = (roles, activeRole) => {
    return roles.filter(role => role.value !== activeRole)
  }

</script>

<div class="layout">
  <div class="fakesidebartotakeupspace">
    <p>Jeg burde ikke synes</p>
  </div>
  <div class="sidebar">
    <a class="logoLink inward-focus-within" href="/">
      <img class="logo" src={logo} alt="Fylkekommunens logo" />
      <img class="logoDarkmode" src={logoDarkmode} alt="Fylkekommunens logo" />
    </a>
    {#each sideMenuItems as menuItem}
      <a href={menuItem.href} class="menuLink inward-focus-within">
        <div class="menuItem{isActiveRoute(menuItem.href, $page.url.pathname) ? ' active' : ''}">
          <span class="material-symbols-outlined">{menuItem.icon}</span>
          <div>{menuItem.title}</div>
        </div>
      </a>
    {/each}
  </div>
  <div class="pageContent">
    <div class="topbar">
      <h1>Min Elev</h1>
      <div class="userContainer">
        <div class="displayName">
          <span>
            {data.user.name} {data.user.impersonating ? `( ${data.user.impersonating} )` : ''}
          </span>
          <span style="font-size: var(--font-size-small);">{data.user.roles.find(role => role.value === data.user.activeRole).roleName}</span>
        </div>
        <!-- Note the position: relative style -->
        <button class="action{showUsermenu ? ' cheatActive' : ''}" on:click={() => {showUsermenu = !showUsermenu}} use:clickOutside on:click_outside={() => {showUsermenu = false}}>
          <span class="material-symbols-outlined">more_vert</span>
          <div class="userMenu{!showUsermenu ? ' hidden' : ''}">
            {#each getAvailableRoles(data.user.roles, data.user.activeRole) as availableRole}
              <form method="POST" action="/?/changeActiveRole">
                <input type="hidden" value="{availableRole.value}" name="active_role" />
                <button class="blank userMenuOption inward-focus-within">Bytt til rolle: {availableRole.roleName}</button>
              </form>
            {/each}
            <button class="blank userMenuOption inward-focus-within">Logg ut</button>
          </div>
        </button>
      </div>
    </div>
    <!--<md-divider role="separator"></md-divider>-->
    <div class="pathtracker">
      {#each getPathLinks($page.url.pathname) as pathlink}
        {#if pathlink.addSlashBefore}
          <span>/</span>
        {/if}
        <a class="pathtrackerlink" href="{pathlink.href}">
          {pathlink.name}
        </a>
      {/each}
    </div>
    <div class="contentContainer">
      <div class="content">
        {#if $navigating}
          <div class="loadingOverlay">
            <div class="spinner" style="width: 10rem">
              <svg viewBox="0 0 50 50" focusable="false" aria-label="Laster...">
                  <title>Laster...</title>
                  <circle cx="25" cy="25" r="20"></circle>
                  <circle cx="25" cy="25" r="20"></circle>
              </svg>
            </div>
          </div>
        {/if}
        {#if data.maintenanceMode}
          <h3>MinElev er under oppussing grunnet fylkesdeling</h3>
        {:else}
          <slot></slot>
        {/if}
      </div>
    </div>
  </div>
</div>


<style>
  .layout {
    display: flex;
  }
  .fakesidebartotakeupspace, .sidebar {
    width: 8rem;
    flex-direction: column;
    flex-shrink: 0;
    align-items: center;
    padding: 1.5rem 0rem;
    display: flex;
    height: 100vh;
    background-color: var(--secondary-color-20);
  }
  .sidebar {
    position: fixed;
  }
  .logoLink {
    padding-bottom: 2rem;
  }
  .logo, .logoDarkmode {
    width: 8rem;
  }
  /* Fylket hakke dark mode...
  @media (prefers-color-scheme: light) {
    .logoDarkmode {
      display: none;
    }
  }
  @media (prefers-color-scheme: dark) {
    .logo {
      display: none;
    }
  }
  */ 
  .logoDarkmode {
    display: none;
  }
  .menuLink, .logoLink {
    border-bottom: 1px solid var(--primary-color);
    text-decoration: none;
    color: var(--font-color);
  }
  .menuItem {
    width: 8rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem 0px;
    cursor: pointer;
  }
  .menuItem span {
    font-size: 1.5rem;
  }
  .menuItem.active {
    font-weight: bold;
    background-color: var(--secondary-color-30);
  }
  .menuItem:hover {
    background-color: var(--secondary-color-10);
  }
  .pageContent {
    flex-grow: 1;
    max-width: 80rem;
    margin: 0rem auto;
    padding: 0rem;
  }
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0rem 2rem;
    border-bottom: 1px solid var(--primary-color);
  }
  .pathtracker {
    display: flex;
    padding: 0.4rem 2rem;
  }
  .pathtrackerlink {
    padding: 0rem 0.4rem;
    text-decoration: none;
  }
  .userContainer {
    display: flex;
    align-items: center;
    position: relative;
  }

  .userContainer .displayName {
    display: flex;
    flex-direction: column;
  }

  .cheatActive {
    background-color: rgba(0,0,0,0.1);
  }

  .userMenu {
    position: absolute;
    display: flex;
    flex-direction: column;
    right: 0.125rem;
    top: 3rem;
    border: 2px solid var(--primary-color);
  }
  .userMenuOption {
    flex-grow: 1;
    padding: 1rem;
    background-color: var(--primary-background-color);
  }
  .userMenuOption:hover {
    padding: 1rem;
    background-color: var(--primary-color-10);
  }

  .loadingOverlay {
    position: fixed;
    height: 100vh;
    width: 100vw;
    background-color: rgba(0,0,0,0.5);
    top: 0;
    left: 0;
    z-index: 1000; /* Should be enough?? */
  }
  .spinner {
    margin: auto;
    margin-top: 5rem;
  }

  .contentContainer {
    padding: 1rem 4rem;
  }
  .content {
    margin: 0rem auto 0rem auto;
  }
  .hidden {
    display: none;
  }
</style>
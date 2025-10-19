// progress-monitor-v2.js
// This file is a copy of the existing app.js with only filename changed to complete the requested rename.

const STORAGE_KEY = 'progress-monitor-v2:data'

// Global defaults/preferences
const DEFAULT_QUAL_LABELS = ['Independent','General Cueing', 'Specific Cueing','Max/Errorless']
const SETTINGS_KEY = 'progress-monitor-v2:settings'
const METRIC_TYPE_OPTIONS = [
  {value:'numeric', label:'Numeric'},
  {value:'percent', label:'Percent (%)'},
  {value:'qual', label:'Qualitative'}
]

// Simple in-memory model with persistence to localStorage
let model = {
  targets: [] // array of {id, title, levels, sessions, data}
}

let activeTargetId = null

// Remember which level sections are expanded so re-renders don't reopen everything
const openLevelPanels = new Set()
// Track which metric cards are open (targetId -> boolean for both cards)
const openMetricCards = new Map()

// User preferences (overridden via modal)
let settings = {
  defaultPerf: 'percent',
  defaultSupport: 'percent',
  defaultQual: DEFAULT_QUAL_LABELS.slice()
}

// Graph mode state
let graphMode = false
const GRAPH_MODE_KEY = 'progress-monitor-v2:graphMode'
let prevOverlaySetting = null
let prevCommentsSetting = null

const el = id => document.getElementById(id)

// Use shared warning modal when available; fall back to native confirm.
function confirmWarningDialog(options = {}) {
  const defaults = {
    title: 'Are you sure?',
    message: 'This action cannot be undone.',
    confirmText: 'Yes, continue',
    cancelText: 'Cancel'
  }
  const config = { ...defaults, ...options }
  const plainMessage = config.message ? String(config.message).replace(/<[^>]*>/g, '') : defaults.message
  if (typeof window !== 'undefined' && window.DomUtils && typeof window.DomUtils.confirmWarning === 'function') {
    return window.DomUtils.confirmWarning(config)
  }
  if (typeof confirm === 'function') {
    return Promise.resolve(confirm(plainMessage))
  }
  return Promise.resolve(true)
}

function clearLocalStorageOnStartup(){
  try{ localStorage.removeItem(STORAGE_KEY) }catch(e){}
  try{ localStorage.removeItem(GRAPH_MODE_KEY) }catch(e){}
}

function uid(prefix='id'){return prefix+Math.random().toString(36).slice(2,9)}

function resolveDefaultQualList(){
  const base = Array.isArray(settings.defaultQual) && settings.defaultQual.length
    ? settings.defaultQual
    : DEFAULT_QUAL_LABELS
  return base.slice()
}

function getQualOptions(target, kind){
  if(!target) return resolveDefaultQualList()
  const key = kind === 'support' ? 'supportQualOptions' : 'perfQualOptions'
  const opts = Array.isArray(target[key]) && target[key].length ? target[key] : null
  if(opts) return opts
  if(Array.isArray(target.qualitativeOptions) && target.qualitativeOptions.length){
    return target.qualitativeOptions
  }
  return resolveDefaultQualList()
}

function normalizeTargetConfig(target){
  if(!target) return
  if(!target.perfType) target.perfType = settings.defaultPerf || 'percent'
  if(!target.supportType) target.supportType = settings.defaultSupport || 'percent'
  if(!Array.isArray(target.perfQualOptions) || !target.perfQualOptions.length){
    if(Array.isArray(target.qualitativeOptions) && target.qualitativeOptions.length){
      target.perfQualOptions = target.qualitativeOptions.slice()
    } else {
      target.perfQualOptions = resolveDefaultQualList()
    }
  }
  if(!Array.isArray(target.supportQualOptions) || !target.supportQualOptions.length){
    if(Array.isArray(target.qualitativeOptions) && target.qualitativeOptions.length){
      target.supportQualOptions = target.qualitativeOptions.slice()
    } else {
      target.supportQualOptions = resolveDefaultQualList()
    }
  }
  // Always store strings for consistency
  target.perfQualOptions = target.perfQualOptions.map(o=>String(o))
  target.supportQualOptions = target.supportQualOptions.map(o=>String(o))
}

function ensureTargetSessions(target, legacySessions){
  if(!Array.isArray(target.sessions)){
    target.sessions = Array.isArray(legacySessions)
      ? legacySessions.map(s => ({ id: s.id || uid('s'), date: s.date || '' }))
      : []
  }
  target.sessions = target.sessions.map(s => ({ id: s.id || uid('s'), date: s.date || '' }))
}

function getTargetSessions(target){
  return Array.isArray(target && target.sessions) ? target.sessions : []
}

function ensureTargetLevels(target){
  if(!Array.isArray(target.levels) || !target.levels.length){
    target.levels = [{ id: uid('l'), title: 'Level 1' }]
  }
}

function normalizeModel(){
  if(!model || !Array.isArray(model.targets)){
    model = { targets: [] }
  }
  const legacySessions = Array.isArray(model.sessions) ? model.sessions : []
  model.targets = model.targets.filter(Boolean).map(target => {
    const normalized = { ...target }
    ensureTargetLevels(normalized)
    normalizeTargetConfig(normalized)
    ensureTargetSessions(normalized, legacySessions)
    if(!normalized.data || typeof normalized.data !== 'object') normalized.data = {}
    return normalized
  })
  delete model.sessions
  ensureActiveTarget()
}

function save(){localStorage.setItem(STORAGE_KEY, JSON.stringify(model))}
function load(){
  const v = localStorage.getItem(STORAGE_KEY)
  if(v){
    try { model = JSON.parse(v) } catch (e) { model = { targets: [] } }
  } else {
    loadSample('demo1')
  }
  normalizeModel()
  loadGraphMode()
}

function saveGraphMode(){localStorage.setItem(GRAPH_MODE_KEY, JSON.stringify(graphMode))}
function loadGraphMode(){const v=localStorage.getItem(GRAPH_MODE_KEY);if(v!==null){graphMode=JSON.parse(v)}}

function loadSample(name){
  if(name==='demo1'){
    model = {
      targets: [
        {
          id: 't1',
          title: 'New target',
          sessions: [],
          levels: [
            { id: 't1l1', title: 'Level 1' }
          ],
          data: {},
          perfType: settings.defaultPerf || 'percent',
          supportType: settings.defaultSupport || 'percent'
        }
      ]
    }
    normalizeModel()
    save()
  }
}

function ensureActiveTarget(){
  const targets = Array.isArray(model.targets) ? model.targets : []
  if(!targets.length){
    activeTargetId = null
    return
  }
  if(!activeTargetId || !targets.some(t => t.id === activeTargetId)){
    activeTargetId = targets[0].id
  }
}

function getActiveTarget(){
  if(!activeTargetId) return null
  return (model.targets || []).find(t => t.id === activeTargetId) || null
}

function setActiveTarget(id){
  if(id && (model.targets || []).some(t => t.id === id)){
    activeTargetId = id
  } else {
    ensureActiveTarget()
  }
  render()
}

function updateTargetSelector(){
  const selector = el('target-selector')
  if(!selector) return
  selector.innerHTML = ''
  const targets = model.targets || []
  if(!targets.length){
    const opt = document.createElement('option')
    opt.value = ''
    opt.textContent = 'No targets yet'
    selector.appendChild(opt)
    selector.disabled = true
    return
  }
  selector.disabled = false
  targets.forEach(target => {
    const opt = document.createElement('option')
    opt.value = target.id
    opt.textContent = target.title || 'Untitled target'
    if(target.id === activeTargetId) opt.selected = true
    selector.appendChild(opt)
  })
}

function formatDate(d){return d}

/* Render grid */
function render(){
  updateTargetSelector()
  const table = el('grid')
  table.innerHTML = ''
  const overlay = el('overlay')
  const activeTarget = getActiveTarget()
  const sessions = activeTarget ? (activeTarget.sessions || []) : []
  const targetsToRender = activeTarget ? [activeTarget] : []

  if(!activeTarget){
    if(overlay) overlay.innerHTML = ''
    const tbody = document.createElement('tbody')
    const tr = document.createElement('tr')
    const td = document.createElement('td')
    td.colSpan = 1
    td.className = 'empty-state'
    td.textContent = 'Add a target to get started.'
    tr.appendChild(td)
    tbody.appendChild(tr)
    table.appendChild(tbody)
    return
  }

  // header
  const thead = document.createElement('thead')
  const htr = document.createElement('tr')
  const th0 = document.createElement('th'); th0.textContent = 'Target'; htr.appendChild(th0)
  sessions.forEach((s,si)=>{
    const th=document.createElement('th')
    const headerWrap = document.createElement('div'); headerWrap.className = 'session-header-cell'
    // inline date picker for session header
  const inp = document.createElement('input'); inp.type = 'date'; inp.className = 'form-input'; inp.value = s.date || ''
  inp.addEventListener('change', (e)=>{ sessions[si].date = e.target.value; save(); render() })
    headerWrap.appendChild(inp)

    const delBtn = document.createElement('button'); delBtn.type = 'button'; delBtn.className = 'session-delete-btn'; delBtn.textContent = '×'
    const dateLabel = s.date ? ` ${s.date}` : ''
    delBtn.setAttribute('aria-label', `Delete session${dateLabel}`)
    delBtn.title = s.date ? `Delete session ${s.date}` : 'Delete session'
    delBtn.addEventListener('click', async (e)=>{
      e.stopPropagation()
      const confirmed = await confirmWarningDialog({
        title: 'Delete session?',
        message: s.date
          ? `This will delete the session dated <strong>${s.date}</strong> and remove all related data. This action cannot be undone.`
          : 'This will delete this session and remove all related data. This action cannot be undone.',
        confirmText: 'Yes, delete',
        cancelText: 'Cancel'
      })
      if(!confirmed) return
      removeSession(s.id)
    })
    headerWrap.appendChild(delBtn)

    th.appendChild(headerWrap)
    htr.appendChild(th)
  })
  thead.appendChild(htr); table.appendChild(thead)

  const tbody = document.createElement('tbody')
  targetsToRender.forEach(target=>{
    // first create rows per level
    // Render levels so the highest level is at the top of the table.
    for(let levelIdx = target.levels.length - 1, displayIndex = 0; levelIdx >= 0; levelIdx--, displayIndex++){
      const level = target.levels[levelIdx]
      const tr = document.createElement('tr');
      if(displayIndex===0){
        const td = document.createElement('td'); td.className='target-cell'; td.rowSpan = target.levels.length
        normalizeTargetConfig(target)

        const configWrap = document.createElement('div'); configWrap.className = 'target-config'


        const header = document.createElement('div'); header.className = 'target-header'
        const titleInput = document.createElement('input'); titleInput.className = 'target-title-input form-input'; titleInput.placeholder = 'Target'; titleInput.value = target.title || ''; titleInput.setAttribute('aria-label','Target name')
        titleInput.addEventListener('change', ()=>{
          const next = titleInput.value.trim() || 'Untitled target'
          if(next !== target.title){ target.title = next; save(); render() }
        })
        header.appendChild(titleInput)

        // --- Target-wide mode selector ---
        const modeWrap = document.createElement('div'); modeWrap.className = 'target-mode-wrap'
        const modeSelect = document.createElement('select')
        modeSelect.className = 'target-mode-select form-input'
        const MODES = [
          {value:'retention', label:'Retention probe'},
          {value:'average', label:'Average of in-session trials'},
          {value:'other', label:'Other (describe below)'}
        ]
        MODES.forEach(opt=>{
          const option = document.createElement('option'); option.value = opt.value; option.textContent = opt.label; if(target.mode === opt.value) option.selected = true; modeSelect.appendChild(option)
        })
        modeSelect.addEventListener('change', ()=>{
          target.mode = modeSelect.value
          save(); render()
        })
        modeWrap.appendChild(modeSelect)

        // Details (shown only for 'other')
        const detailsBox = document.createElement('textarea')
        detailsBox.className = 'target-mode-details form-textarea'
        detailsBox.placeholder = 'Describe metric details (optional)'
        detailsBox.value = target.modeDetails || ''
        detailsBox.style.display = target.mode === 'other' ? '' : 'none'
        detailsBox.addEventListener('change', ()=>{
          target.modeDetails = detailsBox.value
          save();
        })
        modeSelect.addEventListener('change', ()=>{
          detailsBox.style.display = modeSelect.value === 'other' ? '' : 'none'
        })
        modeWrap.appendChild(detailsBox)

        header.appendChild(modeWrap)

        const headerActions = document.createElement('div'); headerActions.className = 'target-header-actions'
        const removeBtn = document.createElement('button'); removeBtn.type='button'; removeBtn.textContent = '×'; removeBtn.className = 'target-delete-btn'; removeBtn.title = 'Delete target'
        removeBtn.addEventListener('click', async ()=>{
          const confirmed = await confirmWarningDialog({
            title: 'Delete target?',
            message: 'This will delete this target, its levels, and all related session data. This action cannot be undone.',
            confirmText: 'Yes, delete',
            cancelText: 'Cancel'
          })
          if(!confirmed) return
          removeTarget(target)
        })
        headerActions.appendChild(removeBtn)
        header.appendChild(headerActions)
        configWrap.appendChild(header)


        const metricGrid = document.createElement('div'); metricGrid.className = 'target-metric-grid'

        // Create both cards and link them together
        const cardGroup = {cards: []} // Shared reference for syncing

        // --- Performance metric info ---
        const perfCard = makeMetricCard({
          label: '',
          selected: target.perfType || 'numeric',
          target,
          field: 'perf',
          cardGroup,
          onTypeChange: value=>{
            target.perfType = value
            normalizeTargetConfig(target)
            save()
            render()
            return true
          },
          extra: {
            title: 'Performance',
            info: target.perfInfo || {title:''},
            onEdit: (field, value) => {
              target.perfInfo = target.perfInfo || {title:''}
              target.perfInfo[field] = value
              save(); render()
            }
          }
        })
        metricGrid.appendChild(perfCard)

        const supportCard = makeMetricCard({
          label: '',
          selected: target.supportType || 'numeric',
          target,
          field: 'support',
          cardGroup,
          onTypeChange: (value, helpers)=>{
            return handleSupportTypeChange(target, value, helpers)
          },
          extra: {
            title: 'Support',
            info: target.supportInfo || {title:''},
            onEdit: (field, value) => {
              target.supportInfo = target.supportInfo || {title:''}
              target.supportInfo[field] = value
              save(); render()
            }
          }
        })
        metricGrid.appendChild(supportCard)
        
        configWrap.appendChild(metricGrid)

        // Levels manager: list levels and provide rename/description/drag-drop reorder/delete controls
        const levelsManager = document.createElement('div'); levelsManager.className = 'levels-manager'
        // Render levels in table display order (highest level first)
        for(let li = target.levels.length - 1; li >= 0; li--){
          const lvl = target.levels[li]
          const row = document.createElement('div'); row.className = 'level-manager-row'
          row.draggable = true
          row.dataset.levelIndex = li
          
          // Drag and drop handlers
          row.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', li)
            row.classList.add('dragging')
          })
          
          row.addEventListener('dragend', () => {
            row.classList.remove('dragging')
          })
          
          row.addEventListener('dragover', (e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
          })
          
          row.addEventListener('drop', (e) => {
            e.preventDefault()
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'))
            const toIndex = li
            if(fromIndex !== toIndex){
              // Move the level from fromIndex to toIndex
              const [movedLevel] = target.levels.splice(fromIndex, 1)
              target.levels.splice(toIndex, 0, movedLevel)
              save()
              render()
            }
          })
          
          // title input
          const titleInput = document.createElement('input'); titleInput.className = 'form-input level-title-input'; titleInput.value = lvl.title || ''
          titleInput.addEventListener('change', ()=>{ lvl.title = titleInput.value; save(); render() })
          // description textarea
          const desc = document.createElement('textarea'); desc.className = 'form-textarea level-desc-input'; desc.rows = 2; desc.placeholder = 'Add notes/comments (optional)'; desc.value = lvl.description || ''
          desc.addEventListener('change', ()=>{ lvl.description = desc.value; save(); render() })
          // controls: delete only
          const controls = document.createElement('div'); controls.className = 'level-controls'
          const delBtn = document.createElement('button'); delBtn.className = 'level-delete-btn'; delBtn.textContent = '×'; delBtn.title = 'Delete level'
          delBtn.addEventListener('click', async ()=>{
            const confirmed = await confirmWarningDialog({
              title: 'Delete level?',
              message: lvl.title
                ? `This will delete <strong>${lvl.title}</strong> and remove its data across all sessions. This action cannot be undone.`
                : 'This will delete this level and remove its data across all sessions. This action cannot be undone.',
              confirmText: 'Yes, delete',
              cancelText: 'Cancel'
            })
            if(!confirmed) return
            removeLevel(target, li)
          })
          controls.appendChild(delBtn)
          // Layout: left column inputs, right column controls
          const leftCol = document.createElement('div'); leftCol.className = 'level-row-body'; leftCol.appendChild(titleInput); leftCol.appendChild(desc)
          row.appendChild(leftCol); row.appendChild(controls)
          levelsManager.appendChild(row)
        }
  const levelsSection = document.createElement('details'); levelsSection.className = 'levels-section'
  if(openLevelPanels.has(target.id)) levelsSection.open = true
        const summary = document.createElement('summary')
        const summaryTitle = document.createElement('span'); summaryTitle.textContent = 'Levels'
        summary.appendChild(summaryTitle)
        
        // Show all level titles in order (highest to lowest, matching table display)
        const levelsList = document.createElement('div'); levelsList.className = 'levels-summary-list'
        for(let li = target.levels.length - 1; li >= 0; li--){
          const lvl = target.levels[li]
          const levelChip = document.createElement('span'); levelChip.className = 'level-summary-chip'
          levelChip.textContent = lvl.title || `Level ${li + 1}`
          levelsList.appendChild(levelChip)
        }
        summary.appendChild(levelsList)
        
        // Add level button in summary (top right)
        const addLevelBtn = document.createElement('button')
        addLevelBtn.type = 'button'
        addLevelBtn.className = 'add-level-btn'
        addLevelBtn.textContent = '+'
        addLevelBtn.title = 'Add level'
        addLevelBtn.addEventListener('click', (e)=>{ 
          e.preventDefault()
          e.stopPropagation()
          addLevel(target) 
        })
        summary.appendChild(addLevelBtn)
        
        const levelsBody = document.createElement('div'); levelsBody.className = 'levels-section-body'
        levelsBody.appendChild(levelsManager)
        
        levelsSection.appendChild(summary); levelsSection.appendChild(levelsBody)
        levelsSection.addEventListener('toggle', ()=>{
          if(levelsSection.open) openLevelPanels.add(target.id)
          else openLevelPanels.delete(target.id)
        })

        configWrap.appendChild(levelsSection)
        td.appendChild(configWrap)
        tr.appendChild(td)
      }

      // Prepare support range for this target (map qualitative to numeric 0-100)
      const supportValues = []
      const supportQual = getQualOptions(target, 'support')
      sessions.forEach(sx=>{
        target.levels.forEach(lv=>{
          const dd = target.data && target.data[sx.id] && target.data[sx.id][lv.id]
          if(dd && typeof dd.support !== 'undefined' && dd.support !== ''){
            if(typeof dd.support === 'number') supportValues.push(dd.support)
            else if(supportQual.length) {
              const idx = supportQual.indexOf(String(dd.support))
              if(idx >= 0) supportValues.push((idx / Math.max(1, supportQual.length - 1)) * 100)
            }
          }
        })
      })
      const sMin = supportValues.length ? Math.min(...supportValues) : 0
      const sMax = supportValues.length ? Math.max(...supportValues) : 100

      // Prepare performance min/max for this target (used for numeric rulers)
      const perfValues = []
      sessions.forEach(sx=>{
        target.levels.forEach(lv=>{
          const dd = target.data && target.data[sx.id] && target.data[sx.id][lv.id]
          if(dd && typeof dd.performance !== 'undefined' && dd.performance !== ''){
            if(typeof dd.performance === 'number') perfValues.push(dd.performance)
            else { const n = Number(dd.performance); if(isFinite(n)) perfValues.push(n) }
          }
        })
      })
      const pMin = perfValues.length ? Math.min(...perfValues) : 0
      const pMax = perfValues.length ? Math.max(...perfValues) : (pMin + 1)

      // Create one TD per session (so coordinates map precisely)
      sessions.forEach((sess, sessIndex)=>{
        const cell = document.createElement('td'); cell.className='level-cell'; cell.dataset.targetId = target.id; cell.dataset.levelId = level.id; cell.dataset.sessionId = sess.id; cell.dataset.levelTitle = level.title || ''
        const inner = document.createElement('div'); inner.className='cell-inner cell-editor'
        // Add clear-cell button
        const clearBtn = document.createElement('button')
        clearBtn.className = 'clear-cell-btn'
        clearBtn.title = 'Clear cell'
        clearBtn.textContent = '×'
        clearBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          clearCellData(target, level, sess)
        })
        inner.appendChild(clearBtn)

        const data = (target.data && target.data[sess.id] && target.data[sess.id][level.id]) || null
        const hasAnyValue = !!(data && (
          (typeof data.performance !== 'undefined' && data.performance !== null && data.performance !== '') ||
          (typeof data.support !== 'undefined' && data.support !== null && data.support !== '') ||
          (typeof data.comments === 'string' && data.comments.trim() !== '')
        ))
        if(hasAnyValue){
          cell.classList.add('cell-has-data')
        } else {
          cell.classList.add('cell-empty')
          inner.classList.add('is-collapsed')
        }
  const placeholder = document.createElement('button')
  placeholder.type = 'button'
  placeholder.className = 'cell-placeholder'
  placeholder.textContent = '-'
        placeholder.setAttribute('aria-label','Click to enter data')
        placeholder.title = 'Click to enter data'

        const row = document.createElement('div'); row.className='cell-row'
        const perfType = target.perfType || 'numeric'
        const supportType = target.supportType || 'numeric'
        const perfQualOptions = getQualOptions(target, 'perf')
        const supportQualOptions = getQualOptions(target, 'support')
        let perf, support

        // create perf control
        if(perfType === 'qual'){
          perf = document.createElement('select'); perf.className='perf qual-select'
          perfQualOptions.forEach(o=>{const op=document.createElement('option');op.value=o;op.textContent=o; if(data && data.performance===o) op.selected=true; perf.appendChild(op)})
          perf.addEventListener('change', ()=>{writeCellData(target, level, sess, {performance:perf.value, support:support.value, comments:comments.value})})
        } else if(perfType === 'percent'){
          perf = document.createElement('input'); perf.className='perf'; perf.type='number'; perf.min=0; perf.max=100; perf.value = data && typeof data.performance !== 'undefined' ? data.performance : ''
          perf.placeholder = '0-100'
          perf.addEventListener('change', ()=>{let v = Number(perf.value); if(isFinite(v)){v=Math.max(0,Math.min(100,v)); perf.value=v} writeCellData(target, level, sess, {performance:perf.value, support:support.value, comments:comments.value})})
        } else {
          perf = document.createElement('input'); perf.className='perf'; perf.type='number'; perf.step='any'; perf.value = data && typeof data.performance !== 'undefined' ? data.performance : ''
          perf.placeholder = 'Perf'
          perf.addEventListener('change', ()=>{writeCellData(target, level, sess, {performance:perf.value, support:support.value, comments:comments.value})})
        }

        // create support control
        if(supportType === 'qual'){
          support = document.createElement('select'); support.className='support qual-select'
          supportQualOptions.forEach(o=>{const op=document.createElement('option');op.value=o;op.textContent=o; if(data && data.support===o) op.selected=true; support.appendChild(op)})
          support.addEventListener('change', ()=>{writeCellData(target, level, sess, {performance:perf.value, support:support.value, comments:comments.value})})
        } else if(supportType === 'percent'){
          support = document.createElement('input'); support.className='support'; support.type='number'; support.min=0; support.max=100; support.value = data && typeof data.support !== 'undefined' ? data.support : ''
          support.placeholder = '0-100'
          support.addEventListener('change', ()=>{let v = Number(support.value); if(isFinite(v)){v=Math.max(0,Math.min(100,v)); support.value=v} writeCellData(target, level, sess, {performance:perf.value, support:support.value, comments:comments.value})})
        } else {
          support = document.createElement('input'); support.className='support'; support.type='number'; support.step='any'; support.value = data && typeof data.support !== 'undefined' ? data.support : ''
          support.placeholder = 'Support'
          support.addEventListener('change', ()=>{writeCellData(target, level, sess, {performance:perf.value, support:support.value, comments:comments.value})})
        }
        row.appendChild(perf); row.appendChild(support)

        const comments = document.createElement('textarea'); comments.className='comments'; comments.placeholder='Comments'; comments.value = data && data.comments ? data.comments : ''
        comments.addEventListener('change', ()=>{writeCellData(target, level, sess, {performance:perf.value, support:support.value, comments:comments.value})})

        inner.appendChild(row)
        inner.appendChild(comments)
        // add a left-edge ruler for performance mapping (visual + measurement)
        const ruler = document.createElement('div')
        ruler.className = 'cell-ruler'
        if(sessIndex === 0){
          const label = document.createElement('div')
          label.className = 'row-level-label'
          label.textContent = level.title || 'Level'
          cell.classList.add('has-row-label')
          cell.appendChild(label)
        }
        cell.appendChild(placeholder)
        cell.appendChild(ruler)
        cell.appendChild(inner)
        const activateEditor = ()=>{
          if(!cell.classList.contains('cell-empty')) return
          cell.classList.remove('cell-empty')
          cell.classList.add('cell-editing')
          inner.classList.remove('is-collapsed')
          setTimeout(()=>{
            if(perf && typeof perf.focus === 'function') perf.focus()
          }, 10)
        }
        placeholder.addEventListener('click', e=>{
          e.stopPropagation()
          activateEditor()
        })
        cell.addEventListener('click', e=>{
          if(!cell.classList.contains('cell-empty')) return
          const targetEl = e.target instanceof Element ? e.target : null
          if(targetEl && targetEl.closest('.row-level-label')) return
          activateEditor()
        })
        const collapseIfBlank = ()=>{
          if(cell.classList.contains('cell-has-data')) return
          const perfVal = perf ? String(perf.value || '').trim() : ''
          const supportVal = support ? String(support.value || '').trim() : ''
          const commentVal = comments ? String(comments.value || '').trim() : ''
          if(!perfVal && !supportVal && !commentVal){
            cell.classList.remove('cell-editing')
            if(!cell.classList.contains('cell-empty')) cell.classList.add('cell-empty')
            inner.classList.add('is-collapsed')
          }
        }
        ;[perf, support, comments].forEach(ctrl=>{
          if(ctrl && typeof ctrl.addEventListener === 'function'){
            ctrl.addEventListener('blur', ()=>{
              setTimeout(()=>{
                if(!cell.contains(document.activeElement)) collapseIfBlank()
              }, 60)
            })
          }
        })
        tr.appendChild(cell)
      })

      tbody.appendChild(tr)
    }
  })

  table.appendChild(tbody)
  // ensure shading is applied for each target after DOM is populated
  targetsToRender.forEach(t=>{ if(t) try{ updateShadingForTarget(t) }catch(e){} })
  // populate rulers (we need to call this after DOM is attached)
  targetsToRender.forEach(t=>{
    // compute per-target perf min/max here
    const perfValues = []
    const targetSessions = getTargetSessions(t)
    targetSessions.forEach(sx=>{
      t.levels.forEach(lv=>{
        const dd = t.data && t.data[sx.id] && t.data[sx.id][lv.id]
        if(dd && typeof dd.performance !== 'undefined' && dd.performance !== ''){
          if(typeof dd.performance === 'number') perfValues.push(dd.performance)
          else {
            const n = Number(dd.performance)
            if(isFinite(n)) perfValues.push(n)
          }
        }
      })
    })
    const pMin = perfValues.length ? Math.min(...perfValues) : 0
    const pMax = perfValues.length ? Math.max(...perfValues) : (pMin + 1)
    // find all TDs for this target
    const tds = Array.from(document.querySelectorAll(`td.level-cell[data-target-id="${t.id}"]`))
    tds.forEach((td, tdIndex)=>{ 
      // Check if this is the first session column for this level
      const tr = td.parentElement
      const sessionCells = tr ? Array.from(tr.querySelectorAll('td.level-cell')) : []
      const isFirstSessionColumn = sessionCells.indexOf(td) === 0
      populateRuler(td, t, pMin, pMax, isFirstSessionColumn) 
    })
  })
  drawOverlay()
  ensureOverlayObservers()
  applyGraphMode()
}

function makeMetricCard({label, selected, target, field, onTypeChange, extra, cardGroup}){
  let type = selected || 'numeric'
  const card = document.createElement('details'); card.className = 'metric-card'
  
  // Restore open state (both cards for a target share the same state)
  const wasOpen = openMetricCards.get(target.id) || false
  card.open = wasOpen

  // Register this card in the group for syncing
  if(cardGroup){
    cardGroup.cards.push(card)
  }

  // Summary (always visible): contains only the title input field
  const summary = document.createElement('summary'); summary.className = 'metric-card-summary'
  
  if(extra){
    const info = extra.info || {title:''}
    // Title input (always visible in summary)
    const titleInput = document.createElement('input')
    titleInput.className = 'metric-title-input form-input'
    titleInput.placeholder = extra.title
    titleInput.value = info.title || ''
    titleInput.addEventListener('change', ()=>{
      extra.onEdit('title', titleInput.value)
    })
    titleInput.addEventListener('click', (e)=>{
      e.stopPropagation() // Prevent toggling when clicking input
    })
    summary.appendChild(titleInput)
  }

  // Track toggle state and sync all cards in the group
  card.addEventListener('toggle', ()=>{
    openMetricCards.set(target.id, card.open)
    // Sync all other cards in the group immediately
    if(cardGroup){
      cardGroup.cards.forEach(otherCard => {
        if(otherCard !== card){
          otherCard.open = card.open
        }
      })
    }
  })

  card.appendChild(summary)

  // Body (collapsible): contains type selector and qualitative options
  const body = document.createElement('div'); body.className = 'metric-card-body'

  const header = document.createElement('div'); header.className = 'metric-card-header'
  const select = document.createElement('select'); select.className = 'metric-select'
  METRIC_TYPE_OPTIONS.forEach(opt=>{
    const option = document.createElement('option'); option.value = opt.value; option.textContent = opt.label; if(opt.value === type) option.selected = true; select.appendChild(option)
  })
  select.addEventListener('change', e=> {
    const nextValue = e.target.value
    const previousValue = type
    const result = onTypeChange(nextValue, {
      previous: previousValue,
      element: select,
      revert: () => {
        setTimeout(() => {
          select.value = previousValue
        }, 0)
      }
    })
    if(result === false){
      setTimeout(() => {
        select.value = previousValue
      }, 0)
      return
    }
    type = nextValue
  })
  header.appendChild(select)
  body.appendChild(header)

  if(type === 'qual'){
    const chips = document.createElement('div'); chips.className = 'metric-chip-row'
    const opts = getQualOptions(target, field)
    if(opts.length){
      const preview = opts.slice(0, 4)
      preview.forEach(opt=>{
        const chip = document.createElement('span'); chip.className = 'metric-chip'; chip.textContent = opt
        chips.appendChild(chip)
      })
      if(opts.length > preview.length){
        const more = document.createElement('span'); more.className = 'metric-chip more-chip'; more.textContent = `+${opts.length - preview.length} more`
        chips.appendChild(more)
      }
    } else {
      const empty = document.createElement('span'); empty.className = 'metric-chip'; empty.textContent = 'Add labels'
      chips.appendChild(empty)
    }
    body.appendChild(chips)

    const editBtn = document.createElement('button'); editBtn.type = 'button'; editBtn.className = 'metric-edit-btn'; editBtn.textContent = 'Edit labels'
    editBtn.addEventListener('click', ()=>{ 
      openQualModal(target, field)
    })
    body.appendChild(editBtn)
  }

  card.appendChild(body)

  return card
}

// Generate printable HTML for a single target
function getPrintableHtmlForTarget(target){
  if(!target) return ''
  const sessions = getTargetSessions(target)
  
  let html = '<div class="print-target-section">'
  html += `<h2 class="print-target-title">${target.title || 'Untitled Target'}</h2>`
  
  // Target configuration info
  const perfType = target.perfType || 'numeric'
  const supportType = target.supportType || 'numeric'
  const perfLabel = target.perfInfo?.title || 'Performance'
  const supportLabel = target.supportInfo?.title || 'Support'
  html += '<div class="print-target-meta">'
  html += `<span><strong>${perfLabel}:</strong> ${METRIC_TYPE_OPTIONS.find(o=>o.value===perfType)?.label || perfType}</span>`
  html += ` | `
  html += `<span><strong>${supportLabel}:</strong> ${METRIC_TYPE_OPTIONS.find(o=>o.value===supportType)?.label || supportType}</span>`
  html += '</div>'
  
  // Wrapper for table and overlay
  html += '<div class="print-table-wrapper">'
  
  // Build table
  html += '<table class="print-table">'
  
  // Header row
  html += '<thead><tr><th class="print-th-level">Level</th>'
  if(sessions.length === 0){
    html += '<th class="print-th-session">No sessions yet</th>'
  } else {
    sessions.forEach(s => {
      const dateStr = s.date ? formatDate(s.date) : 'No date'
      html += `<th class="print-th-session">${dateStr}</th>`
    })
  }
  html += '</tr></thead>'
  
  // Data rows (render levels from highest to lowest)
  html += '<tbody>'
  for(let li = target.levels.length - 1; li >= 0; li--){
    const level = target.levels[li]
    html += '<tr>'
    html += `<td class="print-td-level"><strong>${level.title || 'Level'}</strong>`
    if(level.description) html += `<div class="print-level-desc">${level.description}</div>`
    html += '</td>'
    
    if(sessions.length === 0){
      html += '<td class="print-td-cell">—</td>'
    } else {
      sessions.forEach(sess => {
      const data = target.data?.[sess.id]?.[level.id]
      html += '<td class="print-td-cell'
      
      // Apply background shading if enabled
      if(vizSettings.showCellShading && data?.support !== undefined && data.support !== ''){
        const supportBest = getComputedStyle(document.documentElement).getPropertyValue('--support-best-color').trim() || '#2da36f'
        const supportWorst = getComputedStyle(document.documentElement).getPropertyValue('--support-worst-color').trim() || '#d94141'
        
        // Reuse normalization logic
        const supportType = target.supportType || 'numeric'
        const qualOpts = getQualOptions(target, 'support')
        let t = 0.5
        const norm = normalizeSupport(target, data.support)
        if(typeof norm === 'number'){
          if(norm >= 0 && norm <= 1 && supportType === 'qual'){
            t = norm
          } else {
            // numeric/percent
            const supportValues = []
            sessions.forEach(sx => {
              target.levels.forEach(lv => {
                const dd = target.data?.[sx.id]?.[lv.id]
                if(dd?.support !== undefined && dd.support !== ''){
                  const n = (typeof dd.support === 'number') ? dd.support : Number(dd.support)
                  if(isFinite(n)) supportValues.push(n)
                }
              })
            })
            const sMin = supportValues.length ? Math.min(...supportValues) : 0
            const sMax = supportValues.length ? Math.max(...supportValues) : 100
            const val = Number(norm)
            const denom = (sMax - sMin) || 100
            t = (val - sMin) / denom
          }
        }
        
        const mix = (hexA, hexB, ratio) => {
          const parse = hex => {
            const value = hex.replace('#','')
            const bigint = parseInt(value.length===3 ? value.split('').map(ch=>ch+ch).join('') : value,16)
            return {r:(bigint>>16)&255,g:(bigint>>8)&255,b:bigint&255}
          }
          const a = parse(hexA)
          const b = parse(hexB)
          const weight = Math.min(1, Math.max(0, ratio))
          const r = Math.round(a.r + (b.r - a.r) * weight)
          const g = Math.round(a.g + (b.g - a.g) * weight)
          const bl = Math.round(a.b + (b.b - a.b) * weight)
          return `rgba(${r},${g},${bl},${0.75 + 0.35 * weight})`
        }
        const gradTop = mix(supportBest, supportWorst, t)
        html += `" style="background:linear-gradient(180deg, ${gradTop}, rgba(255,255,255,0.01))`
      }
      html += '">'
      
      if(data){
        if(data.performance !== undefined && data.performance !== ''){
          html += `<div class="print-cell-perf"><strong>${perfLabel}:</strong> ${data.performance}</div>`
        }
        if(data.support !== undefined && data.support !== ''){
          html += `<div class="print-cell-support"><strong>${supportLabel}:</strong> ${data.support}</div>`
        }
        if(vizSettings.showComments && data.comments){
          html += `<div class="print-cell-comments">${data.comments}</div>`
        }
      }
      
      html += '</td>'
    })
    }
    html += '</tr>'
  }
  html += '</tbody></table>'
  
  // Generate overlay SVG if enabled
  if((vizSettings.showOverlay || vizSettings.showLevelOverlay) && sessions.length > 0){
    html += generatePrintOverlaySVG(target, sessions)
  }
  
  html += '</div>' // close print-table-wrapper
  html += '</div>' // close print-target-section
  
  return html
}

// Generate SVG ruler marks for print output
function generatePrintRulers(target, sessions, cellWidth, cellHeight, headerHeight, cellPadding, levelLabelWidth){
  let rulerSvg = '<g class="print-rulers">'
  
  const perfType = target.perfType || 'numeric'
  
  // Calculate pMin/pMax for numeric type
  let pMin = 0, pMax = 100
  if(perfType === 'numeric'){
    const perfValues = []
    sessions.forEach(sx => {
      target.levels.forEach(lv => {
        const dd = target.data?.[sx.id]?.[lv.id]
        if(dd?.performance !== undefined && dd.performance !== ''){
          const val = (typeof dd.performance === 'number') ? dd.performance : Number(dd.performance)
          if(isFinite(val)) perfValues.push(val)
        }
      })
    })
    pMin = perfValues.length ? Math.min(...perfValues) : 0
    pMax = perfValues.length ? Math.max(...perfValues) : (pMin + 1)
  }
  
  // Generate rulers for each level (in the first session column)
  target.levels.forEach((level, li) => {
    const displayIndex = target.levels.length - 1 - li
    const topOfCell = headerHeight + (displayIndex * cellHeight)
    const innerTop = topOfCell + cellPadding
    const innerHeight = cellHeight - (cellPadding * 2)
    const rulerX = levelLabelWidth + 5 // positioned in first column
    
    let rulerPositions = []
    
    if(perfType === 'qual'){
      const q = getQualOptions(target, 'perf')
      q.forEach((label, idx) => {
        const denom = Math.max(1, q.length - 1)
        const normalized = q.length <= 1 ? 0.5 : (1 - (idx / denom))
        const topPercent = (1 - normalized) * 100
        const y = innerTop + (topPercent / 100) * innerHeight
        rulerPositions.push({y, label: String(label)})
      })
    } else if(perfType === 'percent'){
      [0, 25, 50, 75, 100].forEach(v => {
        const topPercent = (1 - (v / 100)) * 100
        const y = innerTop + (topPercent / 100) * innerHeight
        rulerPositions.push({y, label: `${v}%`})
      })
    } else {
      // numeric
      const range = pMax - pMin
      const mid = pMin + (range / 2)
      const formatNum = (val) => {
        if(Number.isInteger(val)) return String(val)
        if(range < 1) return val.toFixed(3)
        if(range < 10) return val.toFixed(2)
        return val.toFixed(1)
      }
      const tickArr = [[pMax, 0], [mid, 50], [pMin, 100]]
      tickArr.forEach(([val, topPercent]) => {
        const y = innerTop + (topPercent / 100) * innerHeight
        rulerPositions.push({y, label: formatNum(val)})
      })
    }
    
    // Draw ruler marks and labels
    rulerPositions.forEach(({y, label}) => {
      // Tick mark
      rulerSvg += `<line x1="${rulerX}" y1="${y}" x2="${rulerX + 4}" y2="${y}" stroke="#9ca3af" stroke-width="1"/>`
      // Label (only for first column)
      rulerSvg += `<text x="${rulerX + 6}" y="${y + 3}" font-size="9" fill="#6b7280" font-family="Segoe UI, Arial, sans-serif">${label}</text>`
    })
  })
  
  rulerSvg += '</g>'
  return rulerSvg
}

// Generate SVG overlay for print output
function generatePrintOverlaySVG(target, sessions){
  if(!target || !sessions || sessions.length === 0) return ''
  
  // Key insight: The table uses table-layout:fixed but fills 100% width of container
  // We need to calculate proportional widths, not fixed pixel widths
  // A typical print page is ~800px wide for content
  const printContentWidth = 1000 // approximate print page width
  const levelLabelWidth = 180
  const availableSessionWidth = printContentWidth - levelLabelWidth
  const cellWidth = availableSessionWidth / sessions.length
  const cellHeight = 120 // increased from 80 to match actual rendered height
  const headerHeight = 60 // increased from 50 to match actual rendered height
  const cellPadding = 14
  
  const tableWidth = printContentWidth
  const tableHeight = headerHeight + (target.levels.length * cellHeight)
  
  let svg = `<svg class="print-overlay" width="${tableWidth}" height="${tableHeight}" viewBox="0 0 ${tableWidth} ${tableHeight}" xmlns="http://www.w3.org/2000/svg">`
  
  // Add rulers if enabled
  if(vizSettings.showRulers){
    svg += generatePrintRulers(target, sessions, cellWidth, cellHeight, headerHeight, cellPadding, levelLabelWidth)
  }
  
  // Calculate performance coordinates for each cell
  const getLevelYCoord = (li, normalized) => {
    // li is level index (0 = first level in array = bottom of display)
    // For print, reverse display order (highest level at top)
    const displayIndex = target.levels.length - 1 - li
    const topOfCell = headerHeight + (displayIndex * cellHeight)
    const innerTop = topOfCell + cellPadding
    const innerHeight = cellHeight - (cellPadding * 2)
    return innerTop + ((1 - normalized) * innerHeight)
  }
  
  const getSessionXCoord = (si) => {
    // Position at left edge of cell content (after label column and cell padding)
    return levelLabelWidth + (si * cellWidth) + cellPadding
  }
  
  const normalizePerfValue = (target, perfVal) => {
    const perfType = target.perfType || 'numeric'
    
    if(perfType === 'qual'){
      const opts = getQualOptions(target, 'perf')
      let idx = -1
      if(typeof perfVal === 'number'){
        idx = perfVal
      } else {
        idx = opts.indexOf(String(perfVal))
        if(idx < 0){
          const v = String(perfVal).toLowerCase()
          idx = opts.findIndex(o => String(o).toLowerCase() === v)
        }
      }
      if(idx >= 0 && opts.length > 1){
        return 1 - (idx / (opts.length - 1))
      }
      return 0.5
    } else if(perfType === 'percent'){
      const n = (typeof perfVal === 'number') ? perfVal : Number(perfVal)
      return isFinite(n) ? (n / 100) : 0.5
    } else {
      // numeric
      const perfValues = []
      sessions.forEach(sx => {
        target.levels.forEach(lv => {
          const dd = target.data?.[sx.id]?.[lv.id]
          if(dd?.performance !== undefined && dd.performance !== ''){
            const val = (typeof dd.performance === 'number') ? dd.performance : Number(dd.performance)
            if(isFinite(val)) perfValues.push(val)
          }
        })
      })
      const pMin = perfValues.length ? Math.min(...perfValues) : 0
      const pMax = perfValues.length ? Math.max(...perfValues) : (pMin + 1)
      const val = Number(perfVal)
      return isFinite(val) ? ((val - pMin) / ((pMax - pMin) || 1)) : 0.5
    }
  }
  
  // Collect points for overall performance overlay (best per session)
  const bestPoints = []
  sessions.forEach((s, si) => {
    // Find highest level with data for this session
    for(let li = target.levels.length - 1; li >= 0; li--){
      const lvl = target.levels[li]
      const d = target.data?.[s.id]?.[lvl.id]
      if(d?.performance !== undefined && d.performance !== ''){
        const normalized = normalizePerfValue(target, d.performance)
        const x = getSessionXCoord(si)
        const y = getLevelYCoord(li, normalized)
        bestPoints.push({x, y})
        break
      }
    }
  })
  
  // Draw level overlays (dashed lines per level)
  if(vizSettings.showLevelOverlay){
    const levelCount = Math.max(1, target.levels.length)
    target.levels.forEach((lvl, li) => {
      const levelPoints = []
      sessions.forEach((s, si) => {
        const d = target.data?.[s.id]?.[lvl.id]
        if(d?.performance !== undefined && d.performance !== ''){
          const normalized = normalizePerfValue(target, d.performance)
          const x = getSessionXCoord(si)
          const y = getLevelYCoord(li, normalized)
          levelPoints.push({x, y})
        }
      })
      
      if(levelPoints.length >= 2){
        const points = levelPoints.map(p => `${p.x},${p.y}`).join(' ')
        const visibilityFactor = li / Math.max(1, levelCount - 1)
        const alpha = Math.max(0.25, 0.6 - (visibilityFactor * 0.25))
        svg += `<polyline points="${points}" fill="none" stroke="rgba(79,158,244,${alpha.toFixed(3)})" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6 4" class="level-trend"/>`
      }
    })
  }
  
  // Draw overall performance overlay (solid line)
  if(vizSettings.showOverlay && bestPoints.length >= 2){
    const points = bestPoints.map(p => `${p.x},${p.y}`).join(' ')
    svg += `<polyline points="${points}" fill="none" stroke="rgba(79,158,244,0.95)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
    
    // Add data point markers
    if(vizSettings.showDataPoints){
      bestPoints.forEach(pt => {
        svg += `<circle cx="${pt.x}" cy="${pt.y}" r="4" fill="#4f9ef4" stroke="white" stroke-width="1.5"/>`
      })
    }
  }
  
  svg += '</svg>'
  return svg
}

// Generate complete printable HTML with meta and styling
function getPrintableHtml(includeAllTargets = false){
  const patient = el('patientName')?.value?.trim() || ''
  const date = el('goalDate')?.value?.trim() || ''
  
  let html = '<div class="print-container">'
  html += '<h1 class="print-main-title">Progress Monitor</h1>'
  
  if(patient || date){
    html += '<div class="print-meta">'
    if(patient) html += `<div><strong>Client:</strong> ${patient}</div>`
    if(date) html += `<div><strong>Date:</strong> ${date}</div>`
    html += '</div>'
  }
  
  if(includeAllTargets){
    const targets = model.targets || []
    if(targets.length === 0){
      html += '<p>No targets to display.</p>'
    } else {
      targets.forEach(target => {
        html += getPrintableHtmlForTarget(target)
      })
    }
  } else {
    const target = getActiveTarget()
    if(target){
      html += getPrintableHtmlForTarget(target)
    } else {
      html += '<p>No active target selected.</p>'
    }
  }
  
  html += '</div>'
  return html
}

// Get inline CSS for print styling
function getPrintStyles(){
  return `
    <style>
      body { 
        background: #fff; 
        color: #1f2630; 
        font-family: 'Segoe UI', Arial, sans-serif; 
        padding: 2em; 
        max-width: 1200px; 
        margin: 0 auto;
      }
      .print-container {
        background: #fff;
      }
      .print-main-title {
        color: #1976d2;
        margin-bottom: 0.5em;
        font-size: 2em;
      }
      .print-meta {
        margin-bottom: 2em;
        padding: 1em;
        background: #f5f7fa;
        border-radius: 6px;
      }
      .print-meta div {
        margin: 0.3em 0;
      }
      .print-target-section {
        margin-bottom: 3em;
        page-break-inside: avoid;
      }
      .print-target-title {
        color: #1976d2;
        margin-bottom: 0.5em;
        font-size: 1.5em;
      }
      .print-target-meta {
        margin-bottom: 1em;
        color: #5f6e7a;
        font-size: 0.95em;
      }
      .print-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1em;
        table-layout: fixed;
      }
      .print-table th,
      .print-table td {
        border: 1px solid #cfd8e3;
        padding: 0.7em;
        text-align: left;
        vertical-align: top;
      }
      .print-table thead th {
        background: #e3e8ee;
        font-weight: 600;
        font-size: 0.95em;
        height: 60px;
      }
      .print-th-level {
        width: 180px;
      }
      .print-td-level {
        background: #f5f7fa;
        font-weight: 500;
        width: 180px;
      }
      .print-level-desc {
        font-size: 0.85em;
        color: #5f6e7a;
        margin-top: 0.3em;
        font-weight: normal;
      }
      .print-td-cell {
        min-height: 120px;
        height: 120px;
      }
      .print-cell-perf,
      .print-cell-support {
        margin-bottom: 0.4em;
        font-size: 0.9em;
      }
      .print-cell-comments {
        margin-top: 0.5em;
        padding-top: 0.5em;
        border-top: 1px solid #e0e0e0;
        font-size: 0.85em;
        color: #5f6e7a;
        font-style: italic;
      }
      .print-table-wrapper {
        position: relative;
        margin: 1em 0;
      }
      .print-overlay {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 10;
      }
      @media print {
        body { padding: 1em; }
        .print-target-section { page-break-after: always; }
        .print-target-section:last-child { page-break-after: auto; }
      }
    </style>
  `
}

function setupControls() {
  // Guard element wiring so missing controls (older/newer shells) don't cause runtime errors
  const addTargetBtn = el('add-target')
  if(addTargetBtn) addTargetBtn.addEventListener('click', addTarget)

  const clearAllBtn = el('clearAllBtn')
  if(clearAllBtn) clearAllBtn.addEventListener('click', clearAllData)

  const addSessionBtn = el('add-session')
  if(addSessionBtn) addSessionBtn.addEventListener('click', addSession)

  const importBtn = el('import-json')
  if(importBtn) importBtn.addEventListener('click', importJSON)

  const exportBtn = el('export-json')
  if(exportBtn) exportBtn.addEventListener('click', exportJSON)

  const sampleSelect = el('sample-data')
  if(sampleSelect) sampleSelect.addEventListener('change', e => { if(e.target.value!=='none') loadSample(e.target.value); render() })

  // Print buttons
  const printCurrentBtn = el('printCurrentBtn')
  if(printCurrentBtn){
    printCurrentBtn.addEventListener('click', () => {
      const bodyHtml = getPrintableHtml(false)
      const headHtml = getPrintStyles()
      if(window.DomUtils && typeof DomUtils.openPrintWindow === 'function'){
        DomUtils.openPrintWindow({ 
          title: 'Progress Monitor - Current Target', 
          bodyHtml, 
          headHtml 
        })
      } else {
        // Fallback for non-Electron environments
        const win = window.open('', '_blank')
        if(win){
          win.document.write(`<!DOCTYPE html><html><head><title>Progress Monitor</title>${headHtml}</head><body>${bodyHtml}<script>window.onload=function(){window.print();}<\/script></body></html>`)
          win.document.close()
        }
      }
    })
  }

  const printAllBtn = el('printAllBtn')
  if(printAllBtn){
    printAllBtn.addEventListener('click', () => {
      const bodyHtml = getPrintableHtml(true)
      const headHtml = getPrintStyles()
      if(window.DomUtils && typeof DomUtils.openPrintWindow === 'function'){
        DomUtils.openPrintWindow({ 
          title: 'Progress Monitor - All Targets', 
          bodyHtml, 
          headHtml 
        })
      } else {
        // Fallback for non-Electron environments
        const win = window.open('', '_blank')
        if(win){
          win.document.write(`<!DOCTYPE html><html><head><title>Progress Monitor</title>${headHtml}</head><body>${bodyHtml}<script>window.onload=function(){window.print();}<\/script></body></html>`)
          win.document.close()
        }
      }
    })
  }

  // Quick-add date/button pair (present in the shell). Use guarded wiring.
  const quickAddDate = el('quick-add-date')
  const quickAddBtn = el('quick-add-btn')
  // Removed redundant quick-add button handler to prevent double alerts. Handler is now only in setup().
}

// Clear a single cell's stored data (used by the clear-cell button)
function clearCellData(target, level, session){
  if(!target || !level || !session) return
  if(!target.data) return
  const sid = session.id
  const lid = level.id
  if(target.data[sid] && typeof target.data[sid][lid] !== 'undefined'){
    delete target.data[sid][lid]
    // remove session key if empty
    if(target.data[sid] && Object.keys(target.data[sid]).length === 0){ delete target.data[sid] }
    save()
    try{ updateShadingForTarget(target) }catch(e){}
    render()
  }
}

function addSessionWithDate(date){
  if(!date) return
  const target = getActiveTarget()
  if(!target) return
  if(!Array.isArray(target.sessions)) target.sessions = []
  // Insert into target.sessions so the array stays chronological (ascending)
  const d = String(date)
  let inserted = false
  for(let i=0;i<target.sessions.length;i++){
    const sd = target.sessions[i].date || ''
    if(!sd || sd > d){
      target.sessions.splice(i,0,{id: uid('s'), date: d}); inserted = true; break
    }
  }
  if(!inserted) target.sessions.push({id: uid('s'), date: d})
  save(); render()
}

// populate ruler ticks/labels inside a td.cell-ruler for percent and numeric perf types
function populateRuler(td, target, pMin, pMax, isFirstSessionColumn){
  const ruler = td.querySelector('.cell-ruler')
  if(!ruler) return
  ruler.innerHTML = ''
  const perfType = target.perfType || 'numeric'
  const rulerPositions = []
  
  // Mark the ruler if it's in the first session column (for CSS styling)
  if(isFirstSessionColumn){
    ruler.classList.add('first-column')
  } else {
    ruler.classList.remove('first-column')
  }
  
  if(perfType === 'qual'){
    // show qualitative markers as small bullets (top->best)
    const q = getQualOptions(target, 'perf')
    q.forEach((label, idx)=>{
      const mark = document.createElement('div'); mark.className='ruler-mark';
      const denom = Math.max(1, q.length - 1)
      const normalized = q.length <= 1 ? 0.5 : (1 - (idx / denom))
      const topPercent = (1 - normalized) * 100
      mark.style.top = `${topPercent}%`
      mark.title = label
      // Add text label (only visible in graph mode for first column)
      if(isFirstSessionColumn){
        const textLabel = document.createElement('span'); textLabel.className='ruler-label';
        textLabel.textContent = String(label)
        mark.appendChild(textLabel)
      }
      ruler.appendChild(mark)
      rulerPositions.push(topPercent)
    })
  } else if(perfType === 'percent'){
    // ticks at 0,25,50,75,100
    [0,25,50,75,100].forEach(v=>{
      const mark = document.createElement('div'); mark.className='ruler-mark';
      const topPercent = (1 - (v/100)) * 100
      mark.style.top = `${topPercent}%`
      // Add text label (only visible in graph mode for first column)
      if(isFirstSessionColumn){
        const textLabel = document.createElement('span'); textLabel.className='ruler-label';
        textLabel.textContent = `${v}%`
        mark.appendChild(textLabel)
      }
      ruler.appendChild(mark)
      rulerPositions.push(topPercent)
    })
  } else {
    // numeric: show ticks for min, mid, max with full precision
    // Calculate a reasonable mid-point
    const range = pMax - pMin
    const mid = pMin + (range / 2)
    
    // Format numbers appropriately - no rounding, show actual values
    const formatNum = (val) => {
      // If the number has decimals, show them; otherwise show as integer
      if(Number.isInteger(val)) return String(val)
      // Determine appropriate decimal places based on the range
      if(range < 1) return val.toFixed(3)
      if(range < 10) return val.toFixed(2)
      return val.toFixed(1)
    }
    
    const tickArr = [[pMax,0],[mid,50],[pMin,100]]
    tickArr.forEach(([val,top])=>{
      const mark = document.createElement('div'); mark.className='ruler-mark';
      mark.style.top = `${top}%`
      // Add text label (only visible in graph mode for first column)
      if(isFirstSessionColumn){
        const textLabel = document.createElement('span'); textLabel.className='ruler-label';
        textLabel.textContent = formatNum(val)
        mark.appendChild(textLabel)
      }
      ruler.appendChild(mark)
      rulerPositions.push(top)
    })
  }
  
  // Store ruler positions on the ruler element for grid line generation
  ruler.dataset.rulerPositions = JSON.stringify(rulerPositions)
}

function addTarget(){
  const qualDefaults = resolveDefaultQualList()
  const t = {
    id:uid('t'),
    title:'New target',
    levels:[{id:uid('l'),title:'Level 1'}],
    sessions: [],
    data:{},
    perfType: settings.defaultPerf || 'percent',
    supportType: settings.defaultSupport || 'percent',
    perfQualOptions: qualDefaults.slice(),
    supportQualOptions: qualDefaults.slice()
  }
  model.targets.push(t);
  activeTargetId = t.id
  save(); render()
}
function removeTarget(target){
  openLevelPanels.delete(target.id)
  model.targets = model.targets.filter(x=>x!==target)
  ensureActiveTarget()
  save(); render()
}
function addLevel(target, insertAfterIndex){
  const l = {id:uid('l'),title:`Level ${target.levels.length+1}`, description: ''};
  if(typeof insertAfterIndex === 'number' && insertAfterIndex >= 0 && insertAfterIndex < target.levels.length){
    target.levels.splice(insertAfterIndex+1, 0, l)
  } else {
    target.levels.push(l)
  }
  save(); render()
}

function removeLevel(target, index){
  if(!target || typeof index !== 'number') return
  const removed = target.levels.splice(index,1)[0]
  if(removed && target.data){
    // remove level data across sessions
    const sessions = Array.isArray(target.sessions) ? target.sessions : []
    sessions.forEach(s=>{ if(target.data[s.id] && typeof target.data[s.id][removed.id] !== 'undefined'){ delete target.data[s.id][removed.id] } })
  }
  save(); render()
}

function moveLevel(target, index, dir){
  const to = index + dir
  if(to < 0 || to >= target.levels.length) return
  const [item] = target.levels.splice(index,1)
  target.levels.splice(to,0,item)
  save(); render()
}

function addSession(){
  const date = prompt('Enter session date (YYYY-MM-DD)')
  if(!date) return
  addSessionWithDate(date)
}

async function clearAllData(){
  const confirmed = await confirmWarningDialog({
    title: 'Clear all progress?',
    message: 'This will remove all targets, sessions, and saved data from the Progress Monitor. This action cannot be undone.',
    confirmText: 'Yes, clear',
    cancelText: 'Cancel'
  })
  if(!confirmed) return
  model = { targets: [] }
  openLevelPanels.clear()
  activeTargetId = null
  save()
  render()
  
  // Ensure autosave state is cleared/saved so the cleared page isn't restored
  try {
    if (window.__tempAutosave && typeof window.__tempAutosave.trySave === 'function') {
      window.__tempAutosave.trySave()
    } else if (window.electronSnapshot && typeof window.electronSnapshot.tempSave === 'function' && window.ProgressMonitorSnapshot && typeof window.ProgressMonitorSnapshot.prepareSnapshot === 'function') {
      // save an empty/cleared snapshot explicitly
      const snap = window.ProgressMonitorSnapshot.prepareSnapshot()
      window.electronSnapshot.tempSave((location.pathname || 'progress-monitor'), snap).catch(() => {})
    }
  } catch (e) { /* ignore autosave errors */ }
}

function removeSession(sessionId){
  if(!sessionId) return
  const target = getActiveTarget()
  if(!target || !Array.isArray(target.sessions)) return
  const idx = target.sessions.findIndex(s=>s.id === sessionId)
  if(idx === -1) return
  const [removed] = target.sessions.splice(idx,1)
  if(removed){
    if(target.data && typeof target.data === 'object' && target.data[removed.id]){
      delete target.data[removed.id]
    }
  }
  save()
  render()
}

function modelKey(tid,lid,sid){return `${tid}::${lid}::${sid}`}

let modalState = null
function openModal(target, level, session){
  modalState = {target,level,session}
  const data = (target.data && target.data[session.id] && target.data[session.id][level.id]) || {performance:'',support:'',comments:''}
  el('m-performance').value = data.performance ?? ''
  el('m-support').value = data.support ?? ''
  el('m-comments').value = data.comments ?? ''
  el('modal').classList.remove('hidden')
}

function closeModal(){modalState=null; el('modal').classList.add('hidden')}

function saveModal(){
  if(!modalState) return
  const payload = {
    performance: el('m-performance').value,
    support: el('m-support').value,
    comments: el('m-comments').value
  }
  const {target,level,session} = modalState
  writeCellData(target, level, session, payload)
  closeModal()
  render()
}

// Normalize a support value to [0,1] where 0 is best and 1 is worst for coloring purposes.
function normalizeSupport(target, rawSupport){
  const qualOpts = getQualOptions(target, 'support')
  const supportType = target.supportType || 'numeric'
  // qualitative mode: map index 0=>0 (best), last=>1 (worst)
  if(supportType === 'qual' && qualOpts.length > 0){
    let idx = -1
    if(typeof rawSupport === 'number') idx = rawSupport
    else { idx = qualOpts.indexOf(String(rawSupport)); if(idx < 0){ const v = String(rawSupport).toLowerCase(); idx = qualOpts.findIndex(o=>String(o).toLowerCase() === v) } }
    if(idx >= 0){
      return (qualOpts.length <= 1) ? 0 : (idx / Math.max(1, qualOpts.length - 1))
    }
    return 0.5
  }

  // percent or numeric: coerce to number and normalize across observed range if possible
  const n = (typeof rawSupport === 'number') ? rawSupport : Number(rawSupport)
  if(isFinite(n)){
    // For percent we assume 0..100; for numeric we will later divide by observed range in caller
    return n
  }

  // fallback: try qualitative mapping if available
  if(qualOpts.length){
    let idx = qualOpts.indexOf(String(rawSupport))
    if(idx < 0){ const v = String(rawSupport).toLowerCase(); idx = qualOpts.findIndex(o=>String(o).toLowerCase() === v) }
    if(idx >= 0) return (qualOpts.length <= 1) ? 0 : (idx / Math.max(1, qualOpts.length - 1))
  }
  return 0.5
}

function writeCellData(target, level, session, {performance, support, comments}){
  target.data = target.data || {}
  target.data[session.id] = target.data[session.id] || {}
  // Note: we now have separate perfType/supportType per target
  const t = {perf: target.perfType || 'numeric', support: target.supportType || 'numeric'}
  let pVal = performance
  let sVal = support
  // Handle perf
  if(t.perf === 'percent'){
    const pNum = Number(performance); pVal = isFinite(pNum) ? Math.max(0, Math.min(100, pNum)) : ''
  } else if(t.perf === 'numeric'){
    const pNum = Number(performance); pVal = performance === '' ? '' : (isFinite(pNum) ? pNum : performance)
  } else { pVal = performance }

  // Handle support
  if(t.support === 'percent'){
    const sNum = Number(support); sVal = isFinite(sNum) ? Math.max(0, Math.min(100, sNum)) : ''
  } else if(t.support === 'numeric'){
    const sNum = Number(support); sVal = support === '' ? '' : (isFinite(sNum) ? sNum : support)
  } else { sVal = support }

  const commentValue = typeof comments === 'string' ? comments : ''
  const trimmedComments = typeof comments === 'string' ? comments.trim() : ''
  const perfEmpty = (pVal === '' || pVal === null || typeof pVal === 'undefined')
  const supportEmpty = (sVal === '' || sVal === null || typeof sVal === 'undefined')

  if(perfEmpty && supportEmpty && !trimmedComments){
    if(target.data[session.id] && typeof target.data[session.id][level.id] !== 'undefined'){
      delete target.data[session.id][level.id]
      if(Object.keys(target.data[session.id]).length === 0){ delete target.data[session.id] }
      save()
      try{ updateShadingForTarget(target) }catch(e){/* fall back */}
      drawOverlay()
      render()
      return
    }
    return
  }

  target.data[session.id][level.id] = {performance: pVal, support: sVal, comments: commentValue}
  save();
  const cellEl = document.querySelector(`td.level-cell[data-target-id="${target.id}"][data-level-id="${level.id}"][data-session-id="${session.id}"]`)
  if(cellEl){
    cellEl.classList.remove('cell-empty','cell-editing')
    cellEl.classList.add('cell-has-data')
    const editor = cellEl.querySelector('.cell-editor')
    if(editor) editor.classList.remove('is-collapsed')
  }
  try{ updateShadingForTarget(target) }catch(e){/* fall back */}
  drawOverlay()
}
 

const pendingShadingUpdates = new Set()
let shadingUpdateHandle = null

function scheduleShadingUpdate(targetId){
  if(!targetId) return
  pendingShadingUpdates.add(targetId)
  if(shadingUpdateHandle !== null) return
  const run = ()=>{
    shadingUpdateHandle = null
    if(!pendingShadingUpdates.size) return
    const targets = Array.isArray(model && model.targets) ? model.targets : []
    pendingShadingUpdates.forEach(id=>{
      const t = targets.find(x=>x && x.id === id)
      if(t){
        try{ updateShadingForTarget(t) }catch(e){}
      }
    })
    pendingShadingUpdates.clear()
  }
  if(typeof requestAnimationFrame === 'function'){
    shadingUpdateHandle = requestAnimationFrame(run)
  } else {
    shadingUpdateHandle = setTimeout(run, 0)
  }
}

function handleSupportTypeChange(target, nextType, helpers){
  if(!target) return false
  const currentType = target.supportType || 'numeric'
  if(nextType === currentType) return true

  const message = 'Are you sure you want to change the Support data type? This will erase all current Support data.'
  const confirmed = typeof confirm === 'function' ? confirm(message) : true
  if(!confirmed){
    return false
  }

  target.supportType = nextType
  normalizeTargetConfig(target)
  resetSupportDataForType(target)
  save()
  render()
  if(target.id) scheduleShadingUpdate(target.id)
  return true
}

function resetSupportDataForType(target){
  if(!target) return
  target.data = target.data || {}
  const sessions = getTargetSessions(target)
  const levels = Array.isArray(target.levels) ? target.levels : []

  if(target.supportType === 'qual'){
    const opts = getQualOptions(target, 'support').map(o => String(o))
    const fallback = opts.length ? opts[0] : ''
    sessions.forEach(sess => {
      const row = target.data[sess.id]
      if(!row) return
      levels.forEach(level => {
        const cell = row[level.id]
        if(!cell) return
        cell.support = fallback
      })
    })
    return
  }

  sessions.forEach(sess => {
    const row = target.data[sess.id]
    if(!row) return
    levels.forEach(level => {
      const cell = row[level.id]
      if(!cell) return
      if('support' in cell) delete cell.support
      if(cell && !cellEntryHasData(cell)) delete row[level.id]
    })
    if(row && Object.keys(row).length === 0) delete target.data[sess.id]
  })
}


function cellEntryHasData(entry){
  if(!entry) return false
  const hasPerf = typeof entry.performance !== 'undefined' && entry.performance !== null && entry.performance !== ''
  const hasSupport = typeof entry.support !== 'undefined' && entry.support !== null && entry.support !== ''
  const hasComments = typeof entry.comments === 'string' && entry.comments.trim() !== ''
  return hasPerf || hasSupport || hasComments
}

// Update shading for a single target in-place (no full rerender)
function updateShadingForTarget(target){
  if(!target) return
  const qualOpts = getQualOptions(target, 'support')
  // collect support values and indices
  const supportIndices = []
  let allQual = true
  getTargetSessions(target).forEach(sx=>{
    target.levels.forEach(lv=>{
      const dd = target.data && target.data[sx.id] && target.data[sx.id][lv.id]
      if(dd && typeof dd.support !== 'undefined' && dd.support !== ''){
        if(typeof dd.support === 'number') allQual = false
        else if(qualOpts.length){
          let idx = qualOpts.indexOf(String(dd.support))
          if(idx < 0){
            const v = String(dd.support).toLowerCase()
            idx = qualOpts.findIndex(o=>String(o).toLowerCase() === v)
          }
          if(idx >= 0) supportIndices.push(idx)
        }
      }
    })
  })
  // For qualitative, always use full index range for min/max
  // Compute observed numeric min/max for support when applicable
  const supportType = target.supportType || 'numeric'
  let sMin = 0, sMax = 100;
  if (supportType === 'qual' && qualOpts.length > 1) {
    sMin = 0;
    sMax = qualOpts.length - 1;
  } else if (supportType === 'percent') {
    // Always use absolute 0-100 for percent mode
    sMin = 0;
    sMax = 100;
  } else {
    // Numeric mode: use observed min/max
    const numericValues = [];
  getTargetSessions(target).forEach(sx => {
      target.levels.forEach(lv => {
        const dd = target.data && target.data[sx.id] && target.data[sx.id][lv.id];
        if (dd && typeof dd.support !== 'undefined' && dd.support !== '') {
          const n = (typeof dd.support === 'number') ? dd.support : Number(dd.support);
          if (isFinite(n)) numericValues.push(n);
        }
      });
    });
    if (numericValues.length) { sMin = Math.min(...numericValues); sMax = Math.max(...numericValues); }
    else { sMin = 0; sMax = 100; }
  }

  // find all existing TDs for this target and update their backgrounds
  const tds = Array.from(document.querySelectorAll(`td.level-cell[data-target-id="${target.id}"]`))
  tds.forEach(td=>{
    const sid = td.dataset.sessionId
    const lid = td.dataset.levelId
    const dd = target.data && target.data[sid] && target.data[sid][lid]
    if(dd && typeof dd.support !== 'undefined' && dd.support !== ''){
      // Normalize support to a 0..1 scale (0 best, 1 worst)
      let t = 0.5
      const norm = normalizeSupport(target, dd.support)
      if(typeof norm !== 'number') { t = 0.5 }
      else if(norm >= 0 && norm <= 1 && supportType === 'qual'){
        // qualitative normalized fraction 0..1
        t = norm
      } else {
        // numeric value (percent or absolute number): map using observed sMin/sMax
        const val = Number(norm)
        const denom = (sMax - sMin) || 100
        t = (val - sMin) / denom
      }
      const supportBest = getComputedStyle(document.documentElement).getPropertyValue('--support-best-color').trim() || '#2da36f'
      const supportWorst = getComputedStyle(document.documentElement).getPropertyValue('--support-worst-color').trim() || '#d94141'
      const mix = (hexA, hexB, ratio)=>{
        const parse = hex=>{
          const value = hex.replace('#','')
          const bigint = parseInt(value.length===3 ? value.split('').map(ch=>ch+ch).join('') : value,16)
          return {r:(bigint>>16)&255,g:(bigint>>8)&255,b:bigint&255}
        }
        const a = parse(hexA)
        const b = parse(hexB)
        const weight = Math.min(1, Math.max(0, ratio))
        const r = Math.round(a.r + (b.r - a.r) * weight)
        const g = Math.round(a.g + (b.g - a.g) * weight)
        const bl = Math.round(a.b + (b.b - a.b) * weight)
        return `rgba(${r},${g},${bl},${0.75 + 0.35 * weight})`
      }
      const gradTop = mix(supportBest, supportWorst, t)
      td.style.background = `linear-gradient(180deg, ${gradTop}, rgba(255,255,255,0.01))`
      return
    }
    // clear background
    td.style.background = ''
  })
}

function exportJSON(){
  const txt = JSON.stringify(model, null, 2)
  const blob = new Blob([txt], {type:'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download='progress-monitor-v2.json'; a.click()
  URL.revokeObjectURL(url)
}

// (replaced by modal-based editor)

function importJSON(){
  const input = document.createElement('input'); input.type='file'; input.accept='application/json'
  input.onchange = ()=>{
    const f = input.files[0]; const reader = new FileReader(); reader.onload = e=>{try{model = JSON.parse(e.target.result); save(); render()}catch(err){alert('Invalid JSON')}}; reader.readAsText(f)
  }
  input.click()
}

/* ========== Snapshot Save/Load for Electron Desktop ========== */

function _formatSnapshotFilename(snapshot, toolName) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const meta = snapshot && snapshot.meta ? snapshot.meta : {}
  // remove all non-alphanumeric characters and ignore whitespace (don't replace with hyphen)
  const rawName = String(meta.patient || meta.clientName || meta.patientName || 'session')
  // Normalize unicode and strip diacritics (NFKD), then remove non-alphanumerics
  const normalized = rawName.normalize ? rawName.normalize('NFKD').replace(/\p{Diacritic}/gu, '') : rawName
  const patient = normalized.replace(/[^0-9A-Za-z]/g, '')
  // Parse date as local for YYYY-MM-DD to avoid timezone shifts
  let d = null
  if (meta.date && /^\d{4}-\d{2}-\d{2}$/.test(meta.date)) {
    const parts = meta.date.split('-')
    d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  } else if (meta.date) {
    d = new Date(meta.date)
  }
  if (!d || isNaN(d.getTime())) d = new Date()
  const day = String(d.getDate()).padStart(2,'0')
  const mon = months[d.getMonth()]
  const year = d.getFullYear()
  return `${patient}-${day}${mon}${year}-${toolName}.json`
}

function prepareSnapshot() {
  const patient = el('patientName')?.value || ''
  const date = el('goalDate')?.value || ''
  return {
    version: 1,
    tool: 'progress-monitor',
    created: new Date().toISOString(),
    meta: { patient, date },
    model: JSON.parse(JSON.stringify(model)), // deep clone
    settings: JSON.parse(JSON.stringify(settings)),
    graphMode: graphMode,
    vizSettings: JSON.parse(JSON.stringify(vizSettings))
  }
}

function restoreSnapshot(snapshot) {
  if (!snapshot || snapshot.tool !== 'progress-monitor') return false
  const meta = snapshot.meta || {}
  if (el('patientName')) el('patientName').value = meta.patient || ''
  if (el('goalDate')) el('goalDate').value = meta.date || ''
  
  if (snapshot.model) {
    model = JSON.parse(JSON.stringify(snapshot.model))
    normalizeModel()
    save()
  }
  
  if (snapshot.settings) {
    settings = JSON.parse(JSON.stringify(snapshot.settings))
    saveSettings()
  }
  
  if (typeof snapshot.graphMode !== 'undefined') {
    graphMode = snapshot.graphMode
    saveGraphMode()
  }
  
  if (snapshot.vizSettings) {
    vizSettings = JSON.parse(JSON.stringify(snapshot.vizSettings))
    saveVizSettings()
  }
  
  render()
  applyVizSettings()
  applyGraphMode()
  
  return true
}

async function saveSnapshotToFile(snapshot) {
  const filename = _formatSnapshotFilename(snapshot, 'ProgressMonitor')
  // prefer electron.saveFile if available via preload
  if (window.electron && typeof window.electron.saveFile === 'function') {
    try {
      const res = await window.electron.saveFile({ 
        defaultPath: filename, 
        filters: [{ name: 'JSON', extensions: ['json'] }], 
        data: JSON.stringify(snapshot, null, 2) 
      })
      return res
    } catch (e) { /* fallthrough to browser save */ }
  }
  // browser fallback: create blob and trigger download
  try {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return { canceled: false }
  } catch (e) { return { canceled: true, error: e.message } }
}

async function loadSnapshotFromFile() {
  // Try electron.openFile first
  if (window.electron && typeof window.electron.openFile === 'function') {
    try {
      const res = await window.electron.openFile({ filters: [{ name: 'JSON', extensions: ['json'] }] })
      if (res && res.canceled) return null
      const path = res.filePaths && res.filePaths[0]
      if (!path) return null
      // Use electronOn.readFile if available
      if (window.electronOn && typeof window.electronOn.readFile === 'function') {
        const read = await window.electronOn.readFile(path, 'utf8')
        if (read && read.success) return JSON.parse(read.data)
        return null
      }
      // fallback to fetch file using file:// URL
      try {
        const text = await fetch('file:///' + path.replace(/\\/g, '/')).then(r => r.text())
        return JSON.parse(text)
      } catch (e) { return null }
    } catch (e) { /* fallthrough to browser file picker */ }
  }
  // Browser fallback: file input
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.addEventListener('change', () => {
      const f = input.files[0]
      if (!f) return resolve(null)
      const reader = new FileReader()
      reader.onload = () => { 
        try { 
          resolve(JSON.parse(reader.result)) 
        } catch (e) { 
          resolve(null) 
        } 
      }
      reader.onerror = () => resolve(null)
      reader.readAsText(f)
    })
    input.click()
  })
}

// Expose to global for Electron menu integration
window.ProgressMonitorSnapshot = { 
  prepareSnapshot, 
  restoreSnapshot, 
  saveSnapshotToFile, 
  loadSnapshotFromFile 
}

/* compute 'best' value per session for each target: highest performance and highest level order wins */
function computeBestPoints(target){
  const points = []
  const sessions = getTargetSessions(target)
  sessions.forEach((s,si)=>{
    // iterate levels from highest index to lowest (assume later = higher)
    // For numeric/percent: pick highest level that has a performance value
    // For qualitative: pick level with highest-ranked qualitative performance
    const perfType = target.perfType || 'numeric'
    if(perfType === 'qual'){
      // build ranking map (higher index => better)
      const q = getQualOptions(target, 'perf')
      const rank = new Map(q.map((v,i)=>[v, q.length - i]))
      let bestLi = null; let bestRank = -Infinity
      for(let li=0; li<target.levels.length; li++){
        const level = target.levels[li]
        const d = target.data && target.data[s.id] && target.data[s.id][level.id]
        if(d && d.performance){
          const r = rank.get(String(d.performance)) || 0
          if(r > bestRank){ bestRank = r; bestLi = li }
        }
      }
      if(bestLi !== null){
        const lvl = target.levels[bestLi]
        const d = target.data && target.data[s.id] && target.data[s.id][lvl.id]
        points.push({sessionIndex:si, levelIndex:bestLi, performance: d && d.performance, support: d && d.support})
      }
    } else {
      let best = null
      for(let li=target.levels.length-1; li>=0; li--){
        const level = target.levels[li]
        const d = target.data && target.data[s.id] && target.data[s.id][level.id]
        if(d && typeof d.performance !== 'undefined' && d.performance !== ''){
          best = {sessionIndex:si,levelIndex:li,performance:d.performance, support:d.support}
          break
        }
      }
      if(best) points.push(best)
    }
  })
  return points
}

// Qualitative options modal handling
let qualEditingContext = null
function openQualModal(target, field){
  qualEditingContext = {target, field}
  const list = getQualOptions(target, field).join('\n')
  el('qual-list').value = list
  const modal = el('qual-modal')
  const titleEl = document.getElementById('qual-modal-title')
  const leadEl = document.getElementById('qual-modal-lead')
  if(titleEl){ titleEl.textContent = field === 'support' ? 'Support Labels' : 'Performance Labels' }
  if(leadEl){
    leadEl.textContent = field === 'support'
      ? 'Enter one support label per line, ordered from least assistance (top) to most (bottom).'
      : 'Enter one performance label per line, ordered from strongest performance (top) to weakest (bottom).'
  }
  modal.classList.remove('hidden')
}
function closeQualModal(){ qualEditingContext = null; el('qual-modal').classList.add('hidden') }
function saveQualModal(){
  if(!qualEditingContext) return
  const txt = el('qual-list').value
  const arr = txt.split('\n').map(s=>s.trim()).filter(Boolean)
  if(arr.length===0){ alert('Provide at least one qualitative option'); return }
  const {target, field} = qualEditingContext
  const key = field === 'support' ? 'supportQualOptions' : 'perfQualOptions'
  target[key] = arr
  normalizeTargetConfig(target)
  save(); closeQualModal(); render()
}

// Settings persistence for user-friendly defaults
function loadSettings(){
  try{
    const s = localStorage.getItem(SETTINGS_KEY)
    if(s){ settings = JSON.parse(s) }
  }catch(e){}
  if(!settings || typeof settings !== 'object'){
    settings = { defaultPerf: 'percent', defaultSupport: 'percent', defaultQual: DEFAULT_QUAL_LABELS.slice() }
  }
  if(!settings.defaultPerf) settings.defaultPerf = 'percent'
  if(!settings.defaultSupport) settings.defaultSupport = 'percent'
  if(!Array.isArray(settings.defaultQual) || !settings.defaultQual.length){ settings.defaultQual = DEFAULT_QUAL_LABELS.slice() }
}
function saveSettings(){ try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) }catch(e){} }

function openSettings(){
  el('settings-modal').classList.remove('hidden')
  el('default-perf').value = settings.defaultPerf
  el('default-support').value = settings.defaultSupport
  el('default-qual').value = settings.defaultQual.join('\n')
}
function closeSettings(){ el('settings-modal').classList.add('hidden') }
function saveSettingsAndClose(){
  settings.defaultPerf = el('default-perf').value
  settings.defaultSupport = el('default-support').value
  const qualLines = el('default-qual').value.split('\n').map(s=>s.trim()).filter(Boolean)
  settings.defaultQual = qualLines.length ? qualLines : DEFAULT_QUAL_LABELS.slice()
  normalizeModel()
  saveSettings(); closeSettings()
}


// Compute the y coordinate inside a TD for the performance value according to the
// target's perfType. Returns {y, perf, support} relative to the table's top (used by drawOverlay).
function computePerfYInCell(td, target, level, session, tableRect){
  const r = td.getBoundingClientRect()
  const padding = 6 // matches .cell-ruler top/bottom in CSS
  const innerTop = r.top - tableRect.top + padding
  const innerHeight = Math.max(8, r.height - padding*2)

  const d = target.data && target.data[session.id] && target.data[session.id][level.id]
  const perfType = target.perfType || 'numeric'
  let normalized = 0.5
  let perfVal = null
  if(d && typeof d.performance !== 'undefined' && d.performance !== ''){
    perfVal = d.performance
    if(perfType === 'qual'){
      const q = getQualOptions(target, 'perf')
      let idx = q.indexOf(String(perfVal))
      if(idx < 0){ const v = String(perfVal).toLowerCase(); idx = q.findIndex(o=>String(o).toLowerCase() === v) }
      if(idx >= 0){
        // qualitative array assumed ordered best->worst (index 0 = best). Normalize so
        // best => 1.0 (top), worst => 0.0 (bottom)
        normalized = q.length <= 1 ? 0.5 : (1 - (idx / Math.max(1, q.length - 1)))
      } else {
        normalized = 0.5
      }
    } else if(perfType === 'percent'){
      const p = Number(perfVal); normalized = isFinite(p) ? Math.max(0, Math.min(100,p)) / 100 : 0.5
    } else {
      // numeric: compute min/max across this target's performance numeric values
      const perfValues = []
      const sessions = getTargetSessions(target)
      sessions.forEach(sx=>{
        target.levels.forEach(lv=>{
          const dd = target.data && target.data[sx.id] && target.data[sx.id][lv.id]
          if(dd && typeof dd.performance !== 'undefined' && dd.performance !== ''){
            if(typeof dd.performance === 'number') perfValues.push(dd.performance)
            else { const n = Number(dd.performance); if(isFinite(n)) perfValues.push(n) }
          }
        })
      })
      const pMin = perfValues.length ? Math.min(...perfValues) : 0
      const pMax = perfValues.length ? Math.max(...perfValues) : (pMin + 1)
      const val = Number(perfVal)
      // map numeric so higher values are 'better' and therefore normalized closer to 1
      normalized = isFinite(val) ? ((val - pMin) / ((pMax - pMin) || 1)) : 0.5
    }
  } else {
    normalized = 0.5
  }

  // Map normalized (1 = best/top, 0 = worst/bottom) to a Y coordinate inside the cell
  const y = innerTop + ((1 - normalized) * innerHeight)
  return {y, perf: perfVal, support: d && d.support}
}

function drawOverlay(){
  drawOverlayEnhanced()
}

/* ========================================
   VISUALIZATION CUSTOMIZATION
   ======================================== */
const VIZ_STORAGE_KEY = 'progress-monitor-v2:viz-settings'
let vizSettings = {
  showOverlay: true,
  showLevelOverlay: false,
  showDataPoints: true,
  showRulers: true,
  showComments: true,
  showCellShading: true
}

function loadVizSettings(){
  try{
    const stored = localStorage.getItem(VIZ_STORAGE_KEY)
    if(stored) vizSettings = {...vizSettings, ...JSON.parse(stored)}
  }catch(e){}
}

function saveVizSettings(){
  try{
    localStorage.setItem(VIZ_STORAGE_KEY, JSON.stringify(vizSettings))
  }catch(e){}
}

function applyVizSettings(){
  const root = document.documentElement
  
  // Apply data attributes for CSS
  root.setAttribute('data-viz-comments', vizSettings.showComments ? 'visible' : 'hidden')
  root.setAttribute('data-viz-rulers', vizSettings.showRulers ? 'visible' : 'hidden')
  root.setAttribute('data-viz-shading', vizSettings.showCellShading ? 'visible' : 'hidden')
  
  // Toggle overlay visibility
  const overlayEl = el('overlay')
  const overlayActive = vizSettings.showOverlay || vizSettings.showLevelOverlay
  if(overlayEl){
    overlayEl.style.display = overlayActive ? 'block' : 'none'
  }
  
  if(overlayActive){
    drawOverlayEnhanced()
  } else if(overlayEl){
    overlayEl.innerHTML = ''
  }
}

function setupVizControls(){
  const controls = {
    'viz-show-overlay': 'showOverlay',
    'viz-show-level-overlay': 'showLevelOverlay',
    'viz-show-data-points': 'showDataPoints',
    'viz-show-rulers': 'showRulers',
    'viz-show-comments': 'showComments',
    'viz-show-cell-shading': 'showCellShading'
  }
  
  // Wire checkboxes
  Object.entries(controls).forEach(([id, setting])=>{
    const checkbox = el(id)
    if(checkbox){
      checkbox.checked = vizSettings[setting]
      checkbox.addEventListener('change', ()=>{
        vizSettings[setting] = checkbox.checked
        saveVizSettings()
        applyVizSettings()
      })
    }
  })
  
  // Graph mode toggle
  const graphModeCheckbox = el('viz-graph-mode')
  if(graphModeCheckbox){
    graphModeCheckbox.checked = graphMode
    graphModeCheckbox.addEventListener('change', ()=>{
      graphMode = graphModeCheckbox.checked
      saveGraphMode()
      applyGraphMode()
    })
  }
}

function applyGraphMode(){
  const root = document.documentElement
  root.setAttribute('data-graph-mode', graphMode ? 'true' : 'false')
  const overlayCheckbox = el('viz-show-overlay')
  const commentsCheckbox = el('viz-show-comments')
  const levelOverlayCheckbox = el('viz-show-level-overlay')
  
  if(graphMode){
    if(prevOverlaySetting === null) prevOverlaySetting = vizSettings.showOverlay
    if(prevCommentsSetting === null) prevCommentsSetting = vizSettings.showComments

    if(!vizSettings.showOverlay && !vizSettings.showLevelOverlay){
      vizSettings.showOverlay = true
    }
    vizSettings.showComments = false

    if(overlayCheckbox){
      overlayCheckbox.checked = vizSettings.showOverlay
      overlayCheckbox.disabled = false
    }
    if(commentsCheckbox){
      commentsCheckbox.checked = false
      commentsCheckbox.disabled = true
    }

    if(levelOverlayCheckbox){
      levelOverlayCheckbox.checked = vizSettings.showLevelOverlay
      levelOverlayCheckbox.disabled = false
    }

    applyVizSettings()
    // Set up tooltips for all cells with data
    setupCellTooltips()
  } else {
    if(prevOverlaySetting !== null) vizSettings.showOverlay = prevOverlaySetting
    if(prevCommentsSetting !== null) vizSettings.showComments = prevCommentsSetting
    prevOverlaySetting = null
    prevCommentsSetting = null

    if(overlayCheckbox){
      overlayCheckbox.disabled = false
      overlayCheckbox.checked = vizSettings.showOverlay
    }
    if(commentsCheckbox){
      commentsCheckbox.disabled = false
      commentsCheckbox.checked = vizSettings.showComments
    }

    if(levelOverlayCheckbox){
      levelOverlayCheckbox.disabled = false
      levelOverlayCheckbox.checked = vizSettings.showLevelOverlay
    }

    applyVizSettings()
    // Remove tooltips
    removeCellTooltips()
  }
}

function setupCellTooltips(){
  const cells = document.querySelectorAll('.level-cell.cell-has-data')
  cells.forEach(cell => {
    cell.addEventListener('mouseenter', showCellTooltip)
    cell.addEventListener('mouseleave', hideCellTooltip)
    cell.addEventListener('mousemove', positionCellTooltip)
  })
}

function removeCellTooltips(){
  const cells = document.querySelectorAll('.level-cell')
  cells.forEach(cell => {
    cell.removeEventListener('mouseenter', showCellTooltip)
    cell.removeEventListener('mouseleave', hideCellTooltip)
    cell.removeEventListener('mousemove', positionCellTooltip)
  })
  const existingTooltip = document.querySelector('.cell-tooltip')
  if(existingTooltip) existingTooltip.remove()
}

function showCellTooltip(e){
  if(!graphMode) return
  
  const cell = e.currentTarget
  const targetId = cell.dataset.targetId
  const levelId = cell.dataset.levelId
  const sessionId = cell.dataset.sessionId
  
  if(!targetId || !levelId || !sessionId) return
  
  const target = model.targets.find(t => t.id === targetId)
  const level = target?.levels?.find(l => l.id === levelId)
  const session = target ? getTargetSessions(target).find(s => s.id === sessionId) : null
  const data = target?.data?.[sessionId]?.[levelId]
  
  if(!data) return
  
  // Create or update tooltip
  let tooltip = document.querySelector('.cell-tooltip')
  if(!tooltip){
    tooltip = document.createElement('div')
    tooltip.className = 'cell-tooltip'
    document.body.appendChild(tooltip)
  }
  
  // Build tooltip content
  let html = `<div class="cell-tooltip-label">${level?.title || 'Level'} - ${formatDate(session?.date || '')}</div>`
  
  if(typeof data.performance !== 'undefined' && data.performance !== null && data.performance !== ''){
    const perfType = target.perfType || 'numeric'
    let perfDisplay = data.performance
    if(perfType === 'percent') perfDisplay = data.performance + '%'
    else if(perfType === 'qual') perfDisplay = data.performance
    html += `<div class="cell-tooltip-row"><span class="cell-tooltip-key">Performance:</span><span class="cell-tooltip-value">${perfDisplay}</span></div>`
  }
  
  if(typeof data.support !== 'undefined' && data.support !== null && data.support !== ''){
    const supportType = target.supportType || 'numeric'
    let supportDisplay = data.support
    if(supportType === 'percent') supportDisplay = data.support + '%'
    else if(supportType === 'qual') supportDisplay = data.support
    html += `<div class="cell-tooltip-row"><span class="cell-tooltip-key">Support:</span><span class="cell-tooltip-value">${supportDisplay}</span></div>`
  }
  
  if(data.comments && data.comments.trim()){
    const escapedComments = data.comments.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    html += `<div class="cell-tooltip-row" style="flex-direction: column; gap: 2px;"><span class="cell-tooltip-key">Comments:</span><span class="cell-tooltip-value" style="white-space: pre-wrap;">${escapedComments}</span></div>`
  }
  
  tooltip.innerHTML = html
  tooltip.classList.add('visible')
  
  // Position tooltip
  positionCellTooltip(e)
}

function hideCellTooltip(){
  const tooltip = document.querySelector('.cell-tooltip')
  if(tooltip) tooltip.classList.remove('visible')
}

function positionCellTooltip(e){
  const tooltip = document.querySelector('.cell-tooltip')
  if(!tooltip || !tooltip.classList.contains('visible')) return
  
  const x = e.clientX + 15
  const y = e.clientY + 15
  
  tooltip.style.left = x + 'px'
  tooltip.style.top = y + 'px'
  
  // Adjust if tooltip goes off screen
  const rect = tooltip.getBoundingClientRect()
  if(rect.right > window.innerWidth){
    tooltip.style.left = (window.innerWidth - rect.width - 10) + 'px'
  }
  if(rect.bottom > window.innerHeight){
    tooltip.style.top = (e.clientY - rect.height - 10) + 'px'
  }
}

/* ========================================
   ENHANCED OVERLAY WITH DATA POINTS
   ======================================== */
let overlayResizeObserver = null
let overlayScrollHandler = null
let overlayScrollRAF = null
let overlayScrollContainer = null

function syncOverlayPosition(){
  const wrap = overlayScrollContainer || document.querySelector('.table-scroll')
  const svg = el('overlay')
  if(!wrap || !svg) return
  svg.style.transform = ''
}

function bindOverlayScroll(wrap){
  if(!wrap) return
  overlayScrollContainer = wrap
  if(!overlayScrollHandler){
    overlayScrollHandler = ()=>{
      if(overlayScrollRAF) cancelAnimationFrame(overlayScrollRAF)
      overlayScrollRAF = requestAnimationFrame(syncOverlayPosition)
    }
  }
  wrap.removeEventListener('scroll', overlayScrollHandler)
  wrap.addEventListener('scroll', overlayScrollHandler)
  syncOverlayPosition()
}

function ensureOverlayObservers(){
  const wrap = document.querySelector('.table-scroll')
  const table = wrap ? wrap.querySelector('table.grid') : null
  if(!wrap || !table) return
  if(!overlayResizeObserver){
    overlayResizeObserver = new ResizeObserver(()=>{ drawOverlayEnhanced() })
  }
  overlayResizeObserver.disconnect()
  overlayResizeObserver.observe(wrap)
  overlayResizeObserver.observe(table)
  bindOverlayScroll(wrap)
}

function drawOverlayEnhanced(){
  const svg = el('overlay'); 
  if(!svg) return
  if(!vizSettings.showOverlay && !vizSettings.showLevelOverlay){
    svg.innerHTML = ''
    return
  }
  svg.innerHTML=''
  
  const table = document.querySelector('table.grid')
  if(!table) return
  const activeTarget = getActiveTarget()
  if(!activeTarget){
    svg.innerHTML = ''
    return
  }
  const sessions = getTargetSessions(activeTarget)
  if(!sessions.length){
    svg.innerHTML = ''
    return
  }

  const tableRect = table.getBoundingClientRect()
  // Use scrollWidth/scrollHeight to capture full table dimensions (not just visible portion)
  svg.setAttribute('width', table.scrollWidth)
  svg.setAttribute('height', table.scrollHeight)

  const tbody = table.querySelector('tbody')
  const tbodyRect = tbody ? tbody.getBoundingClientRect() : tableRect
  const bodyTop = Math.max(0, tbodyRect.top - tableRect.top)
  const bodyBottom = Math.max(bodyTop, tbodyRect.bottom - tableRect.top)

  const NS = 'http://www.w3.org/2000/svg'
  const gridGroup = document.createElementNS(NS, 'g')
  gridGroup.setAttribute('class', 'overlay-grid')
  svg.appendChild(gridGroup)

  let levelLineGroup = null
  if(vizSettings.showLevelOverlay){
    levelLineGroup = document.createElementNS(NS, 'g')
    levelLineGroup.setAttribute('class', 'overlay-level-lines')
    svg.appendChild(levelLineGroup)
  }

  if(graphMode && vizSettings.showRulers){
    const horizontalPositions = new Set()
    const headerCells = Array.from(table.querySelectorAll('thead th'))
    const dataHeaderCells = headerCells.slice(1)
    const firstDataRect = dataHeaderCells.length ? dataHeaderCells[0].getBoundingClientRect() : null
    const lastDataRect = dataHeaderCells.length ? dataHeaderCells[dataHeaderCells.length - 1].getBoundingClientRect() : null
    const horizontalX1 = firstDataRect ? (firstDataRect.left - tableRect.left) : 0
    const horizontalX2 = lastDataRect ? (lastDataRect.right - tableRect.left) : table.scrollWidth
    let firstColumnCells = Array.from(document.querySelectorAll(`td.level-cell.has-row-label[data-target-id="${activeTarget.id}"]`))
    if(!firstColumnCells.length){
      const firstSession = sessions[0]
      if(firstSession){
        firstColumnCells = activeTarget.levels
          .map(lvl => document.querySelector(`td.level-cell[data-target-id="${activeTarget.id}"][data-level-id="${lvl.id}"][data-session-id="${firstSession.id}"]`))
          .filter(Boolean)
      }
    }
    firstColumnCells.forEach(cell => {
      const ruler = cell.querySelector('.cell-ruler')
      if(!ruler) return
      let positions = []
      try { positions = JSON.parse(ruler.dataset.rulerPositions || '[]') } catch(e){ positions = [] }
      const cellRect = cell.getBoundingClientRect()
      positions.forEach(topPercent => {
        const y = cellRect.top - tableRect.top + (Number(topPercent) / 100) * cellRect.height
        horizontalPositions.add(y.toFixed(2))
      })
    })
    Array.from(horizontalPositions)
      .map(Number)
      .sort((a,b)=>a-b)
      .forEach(y => {
        const line = document.createElementNS(NS, 'line')
        line.setAttribute('x1', horizontalX1.toFixed(2))
        line.setAttribute('x2', horizontalX2.toFixed(2))
        line.setAttribute('y1', y.toFixed(2))
        line.setAttribute('y2', y.toFixed(2))
        line.setAttribute('class', 'grid-line-horizontal')
  line.setAttribute('stroke', 'rgba(120,130,150,0.18)')
        line.setAttribute('stroke-width', '1')
        line.setAttribute('shape-rendering', 'crispEdges')
        gridGroup.appendChild(line)
      })
  }

  const levelCenters = activeTarget.levels.map(lvl => {
    return sessions.map(s => {
      const td = document.querySelector(`td.level-cell[data-target-id="${activeTarget.id}"][data-level-id="${lvl.id}"][data-session-id="${s.id}"]`)
      if(!td) return null
      const rect = td.getBoundingClientRect()
      const tdStyle = getComputedStyle(td)
      const borderLeft = parseFloat(tdStyle.borderLeftWidth) || 0
      const baseLeft = td.offsetLeft + borderLeft
      let centerX
      const inner = td.querySelector('.cell-inner')
      if(inner){
        const innerRect = inner.getBoundingClientRect()
        const inset = 0
        centerX = innerRect.left - tableRect.left + inset
      } else {
        const padLeft = parseFloat(tdStyle.paddingLeft) || 0
        centerX = baseLeft + padLeft + 4
      }
      const cellRight = rect.right - tableRect.left - 4
      if(centerX > cellRight) centerX = cellRight
      const cellLeft = rect.left - tableRect.left + 4
      if(centerX < cellLeft) centerX = cellLeft
      const perfInfo = computePerfYInCell(td, activeTarget, lvl, s, tableRect)
      return {x: centerX, y: perfInfo.y, perf: perfInfo.perf, support: perfInfo.support}
    })
  })

  if(levelLineGroup){
    const levelCount = Math.max(1, activeTarget.levels.length)
    activeTarget.levels.forEach((lvl, li)=>{
      const rowPoints = levelCenters[li] || []
      let segment = []
      const flushSegment = ()=>{
        if(segment.length < 2) {
          segment = []
          return
        }
    const poly = document.createElementNS(NS, 'polyline')
    const pts = segment.map(pt=>`${pt.x},${pt.y}`).join(' ')
    poly.setAttribute('points', pts)
    poly.setAttribute('fill', 'none')
    const visibilityFactor = li / Math.max(1, levelCount - 1)
    const alpha = Math.max(0.25, 0.6 - (visibilityFactor * 0.25))
    poly.setAttribute('stroke', `rgba(79,158,244,${alpha.toFixed(3)})`)
    poly.setAttribute('stroke-width', '1.6')
    poly.setAttribute('stroke-linecap', 'round')
    poly.setAttribute('stroke-linejoin', 'round')
    poly.setAttribute('stroke-dasharray', '6 4')
    poly.setAttribute('class', 'level-trend')
    poly.dataset.levelId = lvl.id
    levelLineGroup.appendChild(poly)
        segment = []
      }
      rowPoints.forEach(pt=>{
        const hasPerf = pt && pt.perf !== null && pt.perf !== '' && typeof pt.perf !== 'undefined'
        if(hasPerf){
          segment.push(pt)
        } else {
          flushSegment()
        }
      })
      flushSegment()
    })
  }

  const bestPoints = []
  sessions.forEach((s, si) => {
    for(let li = activeTarget.levels.length - 1; li >= 0; li--){
      const lvl = activeTarget.levels[li]
      const d = activeTarget.data && activeTarget.data[s.id] && activeTarget.data[s.id][lvl.id]
      if(d && typeof d.performance !== 'undefined' && d.performance !== ''){
        const center = levelCenters[li] ? levelCenters[li][si] : null
        if(center) bestPoints.push(center)
        break
      }
    }
  })

  if(vizSettings.showOverlay && bestPoints.length >= 2){
    const perfPoly = document.createElementNS(NS,'polyline')
    const perfPts = bestPoints.map(p=>`${p.x},${p.y}`).join(' ')
    perfPoly.setAttribute('points', perfPts)
    perfPoly.setAttribute('fill','none')
    perfPoly.setAttribute('stroke', 'rgba(79,158,244,0.95)')
    perfPoly.setAttribute('stroke-width','2.5')
    perfPoly.setAttribute('stroke-linecap','round')
    svg.appendChild(perfPoly)
    
    if(vizSettings.showDataPoints){
      bestPoints.forEach(pt=>{
        const circle = document.createElementNS(NS,'circle')
        circle.setAttribute('cx', pt.x)
        circle.setAttribute('cy', pt.y)
        circle.setAttribute('r', '4')
        circle.setAttribute('class', 'data-point')
        svg.appendChild(circle)
      })
    }
  }

  syncOverlayPosition()
}

/* wiring */
function setup(){
  clearLocalStorageOnStartup()
  load()
  loadSettings()
  normalizeModel()
  loadVizSettings()
  
  // Initialize default date using DomUtils if available
  if (window.DomUtils && typeof window.DomUtils.initDefaultDates === 'function') {
    window.DomUtils.initDefaultDates(['#goalDate'])
  }

  const targetSelector = el('target-selector')
  if(targetSelector && !targetSelector.dataset.bound){
    targetSelector.addEventListener('change', (e)=>{
      const selectedId = e.target.value || null
      setActiveTarget(selectedId)
    })
    targetSelector.dataset.bound = 'true'
  }
  
  render()
  applyVizSettings()
  applyGraphMode()
  setupVizControls()
  setupControls()
  
  el('m-cancel').addEventListener('click', closeModal)
  el('m-save').addEventListener('click', saveModal)
  el('qual-cancel').addEventListener('click', closeQualModal)
  el('qual-save').addEventListener('click', saveQualModal)
  // Settings wiring
  const openSettingsBtn = el('open-settings')
  if(openSettingsBtn) openSettingsBtn.addEventListener('click', openSettings)
  el('settings-cancel').addEventListener('click', closeSettings)
  el('settings-save').addEventListener('click', saveSettingsAndClose)
  const qd = el('quick-add-date'); const qb = el('quick-add-btn')
  if(qb && qd){ qb.addEventListener('click', ()=>{ if(qd.value){ addSessionWithDate(qd.value); qd.value = '' } else { alert('Select a date first') } }) }
  window.addEventListener('resize', ()=>{ setTimeout(()=>{ drawOverlayEnhanced(); syncOverlayPosition() },150) })
  
  // Wire native menu events for snapshot save/load
  try {
    if (window.electronOn && typeof window.electronOn.on === 'function') {
      window.electronOn.on('menu:save-session', async () => {
        const snap = prepareSnapshot()
        await saveSnapshotToFile(snap)
      })
      window.electronOn.on('menu:load-session', async () => {
        const snap = await loadSnapshotFromFile()
        if (snap) restoreSnapshot(snap)
      })
    } else {
      // fallback to listening to window events
      window.addEventListener('menu:save-session', async () => { 
        const snap = prepareSnapshot()
        await saveSnapshotToFile(snap)
      })
      window.addEventListener('menu:load-session', async () => { 
        const snap = await loadSnapshotFromFile()
        if (snap) restoreSnapshot(snap)
      })
    }
  } catch (e) { /* ignore wiring errors */ }
}

// Replace drawOverlay with enhanced version
drawOverlay = drawOverlayEnhanced

document.addEventListener('DOMContentLoaded', setup)

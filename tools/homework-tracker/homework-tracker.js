// Homework Tracker JavaScript

class HomeworkTracker {
    constructor() {
        this.components = [];
        this.componentId = 0;
        this.currentConfigComponent = null;
        this.isCreatingComponent = false; // Flag to track if we're creating a new component
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeDefaultValues();
        this.updatePreview();
    }

    initializeDefaultValues() {
        // Set today's date as the default start date
        const today = new Date();
        const dateString = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        document.getElementById('startDate').value = dateString;
        
        // Set default number of weeks
        document.getElementById('numWeeks').value = 1;
    }

    validateWeeksInput(e) {
        const input = e.target;
        const inputValue = input.value.trim();
        
        // Allow empty input (user is typing)
        if (inputValue === '') {
            return;
        }
        
        let value = parseInt(inputValue);
        
        // Handle invalid input or out of range
        if (isNaN(value) || value < 1) {
            value = 1;
        } else if (value > 52) {
            value = 52;
        }
        
        // Update the input value only if it was corrected
        if (parseInt(inputValue) !== value) {
            input.value = value;
        }
    }

    bindEvents() {
        // Drag and drop events for components
        const draggableComponents = document.querySelectorAll('.draggable-component');
        draggableComponents.forEach(component => {
            component.addEventListener('dragstart', this.handleDragStart.bind(this));
            // Add click event to append component
            component.addEventListener('click', (e) => {
                const componentType = e.currentTarget.dataset.component;
                this.addComponent(componentType);
            });
        });

        // Drop zone events
        const dropzone = document.getElementById('templateDropzone');
        dropzone.addEventListener('dragover', this.handleDragOver.bind(this));
        dropzone.addEventListener('drop', this.handleDrop.bind(this));
        dropzone.addEventListener('dragleave', this.handleDragLeave.bind(this));

        // Button events
        document.getElementById('clearTemplate').addEventListener('click', this.clearTemplate.bind(this));
        document.getElementById('previewMode').addEventListener('click', this.togglePreviewMode.bind(this));
        document.getElementById('printBtn').addEventListener('click', this.printLog.bind(this));
        
        // Preview mode navigation buttons
        document.getElementById('backToEdit').addEventListener('click', this.togglePreviewMode.bind(this));
        document.getElementById('printFromPreview').addEventListener('click', this.printLog.bind(this));

        // Modal events
        document.getElementById('closeConfigModal').addEventListener('click', this.closeConfigModal.bind(this));
        document.getElementById('cancelConfig').addEventListener('click', this.closeConfigModal.bind(this));
        document.getElementById('saveConfig').addEventListener('click', this.saveComponentConfig.bind(this));
        document.getElementById('modalOverlay').addEventListener('click', this.closeConfigModal.bind(this));

        // Form input events
        const formInputs = document.querySelectorAll('#clientName, #clinicianName, #logTitle, #startDate, #numWeeks');
        formInputs.forEach(input => {
            input.addEventListener('input', this.updatePreview.bind(this));
        });

        // Add validation for numWeeks input
        const numWeeksInput = document.getElementById('numWeeks');
        numWeeksInput.addEventListener('input', this.validateWeeksInput.bind(this));
        numWeeksInput.addEventListener('blur', this.validateWeeksInput.bind(this));
    }

    handleDragStart(e) {
        // This handles dragging from component library
        e.dataTransfer.setData('text/plain', e.target.dataset.component);
        e.dataTransfer.setData('source', 'library');
        e.target.style.opacity = '0.5';
    }

    handleTemplateDragStart(e) {
        // This handles dragging existing template components
        const componentId = e.target.dataset.componentId;
        e.dataTransfer.setData('text/plain', componentId);
        e.dataTransfer.setData('source', 'template');
        e.target.style.opacity = '0.5';
        
        // Prevent event bubbling
        e.stopPropagation();
    }

    handleTemplateDragEnd(e) {
        e.target.style.opacity = '1';
    }

    handleGroupDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('group-drag-over');
    }

    handleGroupDragLeave(e) {
        e.currentTarget.classList.remove('group-drag-over');
    }

    handleGroupDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('group-drag-over');
        
        const data = e.dataTransfer.getData('text/plain');
        const source = e.dataTransfer.getData('source');
        const groupId = parseInt(e.currentTarget.dataset.groupId);
        
        if (source === 'library') {
            // Adding new component to group
            this.addComponentToGroup(data, groupId);
        } else if (source === 'template') {
            // Moving existing component to group
            this.moveComponentToGroup(parseInt(data), groupId);
        }

        // Reset opacity for dragged elements
        document.querySelectorAll('.draggable-component, .template-component').forEach(el => {
            el.style.opacity = '1';
        });
    }

    addComponentToGroup(componentType, groupId) {
        const group = this.components.find(c => c.id === groupId);
        if (!group || group.type !== 'exercise-group') return;

        // Create new exercise component with temporary id
        const newExercise = {
            id: `ex${group.config.exercises.length + 1}`,
            type: componentType,
            config: {
                ...this.getDefaultConfig(componentType),
                title: `Exercise ${group.config.exercises.length + 1}`
            }
        };

        // Set up state for group exercise creation
        this.pendingGroupExercise = newExercise;
        this.targetGroupId = groupId;
        this.isCreatingGroupExercise = true;

        // Open config modal
        this.openConfigModal(newExercise);
    }

    moveComponentToGroup(componentId, groupId) {
        const component = this.components.find(c => c.id === componentId);
        const group = this.components.find(c => c.id === groupId);
        
        if (!component || !group || group.type !== 'exercise-group' || componentId === groupId) return;

        // Convert component to exercise and add to group
        const newExercise = {
            id: `ex${group.config.exercises.length + 1}`,
            type: component.type,
            config: { ...component.config }
        };

        group.config.exercises.push(newExercise);
        
        // Remove the original component
        this.components = this.components.filter(c => c.id !== componentId);
        this.renderTemplateComponents();
    }

    getExerciseTypeFromTrackingType(trackingType) {
        const mapping = {
            'checkbox': 'checkbox-exercise',
            'rating': 'rating-exercise',
            'repetition': 'repetition-exercise',
            'time': 'time-exercise',
            'blank': 'blank-exercise'
        };
        return mapping[trackingType] || 'checkbox-exercise';
    }

    removeExerciseFromGroup(groupId, exerciseIndex) {
        const group = this.components.find(c => c.id === groupId);
        if (!group || group.type !== 'exercise-group') return;

        if (group.config.exercises.length <= 1) {
            alert('Exercise groups must contain at least one exercise. Delete the group instead if you want to remove it.');
            return;
        }

        group.config.exercises.splice(exerciseIndex, 1);
        this.renderTemplateComponents();
    }

    openStandardExerciseConfig(exercise, parentGroup, exerciseIndex) {
        // Store parent context for saving changes back
        this.editingExerciseGroup = parentGroup;
        this.editingExerciseIndex = exerciseIndex;
        
        // Make sure we're not in creation mode
        this.isCreatingComponent = false;
        this.isCreatingGroupExercise = false;
        
        // Open standard config modal for the exercise
        this.openConfigModal(exercise);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const data = e.dataTransfer.getData('text/plain');
        const source = e.dataTransfer.getData('source');
        
        if (source === 'library') {
            // Adding new component from library
            this.addComponent(data);
        } else if (source === 'template') {
            // Reordering existing component
            this.reorderComponent(parseInt(data), e);
        }

        // Reset opacity for dragged elements
        document.querySelectorAll('.draggable-component, .template-component').forEach(el => {
            el.style.opacity = '1';
        });
    }

    addComponent(type) {
        if (type === 'exercise-group') {
            this.showExerciseGroupSetupDialog();
        } else {
            // Create a temporary component without adding to components array
            const component = {
                id: ++this.componentId,
                type: type,
                config: this.getDefaultConfig(type)
            };

            // Mark as creating new component
            this.isCreatingComponent = true;
            
            // Open configuration modal for the new component
            this.openConfigModal(component);
        }
    }

    showExerciseGroupSetupDialog() {
        const modal = document.getElementById('configModal');
        const title = document.getElementById('configModalTitle');
        const body = document.getElementById('configModalBody');

        title.textContent = 'Setup Exercise Group';
        body.innerHTML = `
            <div class="form-group">
                <label for="groupTitle">Group Title:</label>
                <input type="text" id="groupTitle" value="Exercise Group" class="full-width">
            </div>
            
            <div class="form-group">
                <label for="exerciseType">Exercise Type:</label>
                <select id="exerciseType" class="full-width">
                    <option value="checkbox-exercise">Checkbox Exercises</option>
                    <option value="rating-exercise">Rating Exercises</option>
                    <option value="repetition-exercise">Repetition Exercises</option>
                    <option value="time-exercise">Time Exercises</option>
                    <option value="blank-exercise">Blank Exercises</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="exerciseCount">Number of Exercises:</label>
                <input type="number" id="exerciseCount" value="3" min="1" max="10" class="full-width">
            </div>
            
            <div id="exerciseNames" class="form-group">
                <label>Exercise Names:</label>
                <div id="exerciseNameInputs">
                    ${this.generateExerciseNameInputs(3)}
                </div>
            </div>
        `;

        // Add event listener for exercise count changes
        document.getElementById('exerciseCount').addEventListener('input', (e) => {
            const count = parseInt(e.target.value) || 1;
            document.getElementById('exerciseNameInputs').innerHTML = this.generateExerciseNameInputs(count);
        });

    // Set a flag to indicate we're in exercise group creation mode
    this.isCreatingExerciseGroup = true;

    modal.classList.add('active');
    }

    generateExerciseNameInputs(count) {
        let html = '';
        for (let i = 1; i <= count; i++) {
            html += `
                <div class="exercise-name-input">
                    <input type="text" id="exerciseName${i}" value="Exercise ${i}" placeholder="Exercise ${i}" class="full-width">
                </div>
            `;
        }
        return html;
    }

    createExerciseGroup() {
        const title = document.getElementById('groupTitle').value;
        const exerciseType = document.getElementById('exerciseType').value;
        const exerciseCount = parseInt(document.getElementById('exerciseCount').value);

        // Create the exercises array with custom names
        const exercises = [];
        for (let i = 1; i <= exerciseCount; i++) {
            const nameInput = document.getElementById(`exerciseName${i}`);
            const exerciseName = nameInput ? nameInput.value : `Exercise ${i}`;
            
            exercises.push({
                id: `ex${i}`,
                type: exerciseType,
                config: {
                    ...this.getDefaultConfig(exerciseType),
                    title: exerciseName
                }
            });
        }

        const component = {
            id: ++this.componentId,
            type: 'exercise-group',
            config: {
                title: title,
                exercises: exercises,
                trackingType: this.getTrackingTypeFromExerciseType(exerciseType)
            }
        };

        this.components.push(component);
        this.renderTemplateComponents();
        this.updatePlaceholder();
        
        // Clear the exercise group creation flag
        this.isCreatingExerciseGroup = false;
        
        this.closeConfigModal();
    }

    getTrackingTypeFromExerciseType(exerciseType) {
        const mapping = {
            'checkbox-exercise': 'checkbox',
            'rating-exercise': 'rating',
            'repetition-exercise': 'repetition',
            'time-exercise': 'time',
            'blank-exercise': 'blank'
        };
        return mapping[exerciseType] || 'checkbox';
    }

    reorderComponent(componentId, dropEvent) {
        const component = this.components.find(c => c.id === componentId);
        if (!component) return;

        // Remove component from current position
        this.components = this.components.filter(c => c.id !== componentId);

        // Find drop position based on mouse position
        const dropzone = document.getElementById('templateDropzone');
        const afterElement = this.getDragAfterElement(dropzone, dropEvent.clientY);
        
        let insertIndex = this.components.length; // Default to end
        
        if (afterElement) {
            const afterId = parseInt(afterElement.dataset.componentId);
            insertIndex = this.components.findIndex(c => c.id === afterId);
        }

        // Insert component at new position
        this.components.splice(insertIndex, 0, component);
        this.renderTemplateComponents();
    }

    getDragAfterElement(container, y) {
        if (window.DomUtils && DomUtils.getVerticalAfterElement) {
            return DomUtils.getVerticalAfterElement(container, y, '.template-component:not([style*="opacity: 0.5"])');
        }
        const els = Array.from(container.querySelectorAll('.template-component:not([style*="opacity: 0.5"])'));
        for (let i = 0; i < els.length; i++) {
            const rect = els[i].getBoundingClientRect();
            if (y < rect.top + rect.height / 2) return els[i];
        }
        return null;
    }

    getDefaultConfig(type) {
        const defaults = {
            'exercise-group': {
                title: 'Exercise Group',
                exercises: [
                    {
                        id: 'ex1',
                        type: 'checkbox-exercise',
                        config: {
                            title: 'Exercise 1',
                            description: 'Check when completed',
                            timesPerDay: {
                                enabled: false,
                                count: 1,
                                labels: []
                            },
                            schedule: {
                                type: 'daily',
                                everyXDays: 1,
                                startDay: 1,
                                daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                            }
                        }
                    },
                    {
                        id: 'ex2',
                        type: 'checkbox-exercise',
                        config: {
                            title: 'Exercise 2',
                            description: 'Check when completed',
                            timesPerDay: {
                                enabled: false,
                                count: 1,
                                labels: []
                            },
                            schedule: {
                                type: 'daily',
                                everyXDays: 1,
                                startDay: 1,
                                daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                            }
                        }
                    }
                ],
                // Legacy property for backwards compatibility
                trackingType: 'checkbox'
            },
            'checkbox-exercise': {
                title: 'Complete Exercise',
                description: 'Check when completed',
                timesPerDay: {
                    enabled: false,
                    count: 1,
                    labels: []
                },
                schedule: {
                    type: 'daily',
                    everyXDays: 1,
                    startDay: 1,
                    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                }
            },
            'rating-exercise': {
                title: 'Rate Your Performance',
                description: 'Rate from 1 to _',
                scaleMax: 5,
                scaleLabels: ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'],
                timesPerDay: {
                    enabled: false,
                    count: 1,
                    labels: []
                },
                schedule: {
                    type: 'daily',
                    everyXDays: 1,
                    startDay: 1,
                    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                }
            },
            'repetition-exercise': {
                title: 'Repetition Exercise',
                description: 'Track number of repetitions',
                targetReps: 10,
                timesPerDay: {
                    enabled: false,
                    count: 1,
                    labels: []
                },
                schedule: {
                    type: 'daily',
                    everyXDays: 1,
                    startDay: 1,
                    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                }
            },
            'time-exercise': {
                title: 'Time-Based Exercise',
                description: 'Track practice duration',
                targetTime: '15 minutes',
                timesPerDay: {
                    enabled: false,
                    count: 1,
                    labels: []
                },
                schedule: {
                    type: 'daily',
                    everyXDays: 1,
                    startDay: 1,
                    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                }
            },
            'blank-exercise': {
                title: 'Blank Exercise',
                description: 'Free writing space',
                timesPerDay: {
                    enabled: false,
                    count: 1,
                    labels: []
                },
                schedule: {
                    type: 'daily',
                    everyXDays: 1,
                    startDay: 1,
                    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                }
            },
            'notes-section': {
                title: 'Notes',
                description: 'Space for additional comments'
            },
            'custom-header': {
                title: 'Section Header',
                description: ''
            }
        };

        return { ...defaults[type] };
    }

    renderTemplateComponents() {
        const dropzone = document.getElementById('templateDropzone');
        const componentsHTML = this.components.map(component => 
            this.createComponentHTML(component)
        ).join('');

        dropzone.innerHTML = componentsHTML + dropzone.querySelector('.dropzone-placeholder').outerHTML;

        // Bind events to new components
        this.bindComponentEvents();
    }

    createComponentHTML(component) {
        const icons = {
            'exercise-group': '📝',
            'checkbox-exercise': '☑️',
            'rating-exercise': '⭐',
            'repetition-exercise': '🔢',
            'time-exercise': '⏱️',
            'blank-exercise': '📝',
            'notes-section': '📄',
            'custom-header': '📋'
        };

        return `
            <div class="template-component" data-component-id="${component.id}" draggable="true">
                <div class="component-header">
                    <div class="component-title">
                        <span class="drag-handle">⋮⋮</span>
                        <span>${icons[component.type]}</span>
                        <span class="editable-title" data-field="title">${component.config.title}</span>
                    </div>
                    <div class="component-controls">
                        ${component.type !== 'exercise-group' ? '<button class="control-btn config-btn" title="Configure">⚙️</button>' : ''}
                        <button class="control-btn delete-btn" title="Delete">&times;</button>
                    </div>
                </div>
                <div class="component-preview">
                    ${this.createComponentPreview(component)}
                </div>
                ${component.type === 'exercise-group' ? this.createGroupDropZone(component) : ''}
            </div>
        `;
    }

    createGroupDropZone(groupComponent) {
        return `
            <div class="group-drop-zone" data-group-id="${groupComponent.id}">
                <div class="group-drop-placeholder">
                    Drop exercises here to add to group
                </div>
            </div>
        `;
    }

    createComponentPreview(component) {
        switch (component.type) {
            case 'exercise-group':
                const exercisesList = component.config.exercises.map((ex, index) => 
                    `<div class="group-exercise-item">
                        <div class="exercise-details">
                            <span class="exercise-name editable-exercise-title" data-field="title" data-exercise-index="${index}">${ex.config.title}</span>
                            <small class="exercise-description editable-exercise-description" data-field="description" data-exercise-index="${index}">${ex.config.description}</small>
                        </div>
                        <div class="exercise-controls">
                            <button class="control-btn exercise-config-btn" data-group-id="${component.id}" data-exercise-index="${index}" title="Configure Exercise">⚙️</button>
                            <button class="control-btn exercise-remove-btn" data-group-id="${component.id}" data-exercise-index="${index}" title="Remove Exercise">🗑️</button>
                        </div>
                    </div>`
                ).join('');
                
                return `
                    <div class="exercise-group-children">
                        ${exercisesList}
                    </div>
                `;
            case 'checkbox-exercise':
                return `<p class="editable-description" data-field="description">${component.config.description}</p>`;
            case 'rating-exercise':
                // Use scaleMax if available, otherwise fall back to scaleType for backward compatibility
                let maxRating = component.config.scaleMax;
                if (!maxRating && component.config.scaleType) {
                    maxRating = component.config.scaleType === '1-10' ? 10 : 5;
                }
                maxRating = maxRating || 5; // Default to 5 if nothing is set
                return `
                    <p class="editable-description" data-field="description">${component.config.description}</p>
                    <p><strong>Scale:</strong> 1-${maxRating}</p>
                `;
            case 'repetition-exercise':
                return `
                    <p class="editable-description" data-field="description">${component.config.description}</p>
                    <p><strong>Target:</strong> ${component.config.targetReps} reps</p>
                `;
            case 'time-exercise':
                return `
                    <p class="editable-description" data-field="description">${component.config.description}</p>
                    <p><strong>Target:</strong> ${component.config.targetTime}</p>
                `;
            case 'blank-exercise':
                return `<p class="editable-description" data-field="description">${component.config.description}</p>`;
            case 'notes-section':
                return `<p class="editable-description" data-field="description">${component.config.description}</p>`;
            case 'custom-header':
                return `<div class="editable-description" data-field="description">${component.config.description || 'Add description...'}</div>`;
            default:
                return '<p>Component preview</p>';
        }
    }

    bindComponentEvents() {
        // Configuration buttons
        document.querySelectorAll('.config-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const componentId = parseInt(e.target.closest('.template-component').dataset.componentId);
                const component = this.components.find(c => c.id === componentId);
                this.isCreatingComponent = false; // We're editing an existing component
                this.openConfigModal(component);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const componentId = parseInt(e.target.closest('.template-component').dataset.componentId);
                this.deleteComponent(componentId);
            });
        });

        // Drag events for existing template components
        document.querySelectorAll('.template-component').forEach(component => {
            component.addEventListener('dragstart', this.handleTemplateDragStart.bind(this));
            component.addEventListener('dragend', this.handleTemplateDragEnd.bind(this));
        });

        // Group drop zone events
        document.querySelectorAll('.group-drop-zone').forEach(zone => {
            zone.addEventListener('dragover', this.handleGroupDragOver.bind(this));
            zone.addEventListener('drop', this.handleGroupDrop.bind(this));
            zone.addEventListener('dragleave', this.handleGroupDragLeave.bind(this));
        });

        // Individual exercise config buttons
        document.querySelectorAll('.exercise-config-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const groupId = parseInt(e.target.dataset.groupId);
                const exerciseIndex = parseInt(e.target.dataset.exerciseIndex);
                const group = this.components.find(c => c.id === groupId);
                if (group && group.config.exercises[exerciseIndex]) {
                    this.openStandardExerciseConfig(group.config.exercises[exerciseIndex], group, exerciseIndex);
                }
            });
        });

        // Individual exercise remove buttons
        document.querySelectorAll('.exercise-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const groupId = parseInt(e.target.dataset.groupId);
                const exerciseIndex = parseInt(e.target.dataset.exerciseIndex);
                this.removeExerciseFromGroup(groupId, exerciseIndex);
            });
        });

        // Inline editing
        this.bindInlineEditing();
    }

    bindInlineEditing() {
        // Title editing
        document.querySelectorAll('.editable-title').forEach(element => {
            element.addEventListener('click', (e) => {
                this.startInlineEdit(e.target, 'text');
            });
        });

        // Description editing
        document.querySelectorAll('.editable-description').forEach(element => {
            element.addEventListener('click', (e) => {
                this.startInlineEdit(e.target, 'text');
            });
        });

        // Description editing
        document.querySelectorAll('.editable-description').forEach(element => {
            element.addEventListener('click', (e) => {
                this.startInlineEdit(e.target, 'textarea');
            });
        });

        // Exercise title editing (within groups)
        document.querySelectorAll('.editable-exercise-title').forEach(element => {
            element.addEventListener('click', (e) => {
                this.startInlineExerciseEdit(e.target);
            });
        });

        // Exercise description editing (within groups)
        document.querySelectorAll('.editable-exercise-description').forEach(element => {
            element.addEventListener('click', (e) => {
                this.startInlineExerciseEdit(e.target);
            });
        });

        // Exercise list editing (simplified - opens config modal for complex editing)
        document.querySelectorAll('.editable-list').forEach(element => {
            element.addEventListener('click', (e) => {
                const componentId = parseInt(e.target.closest('.template-component').dataset.componentId);
                const component = this.components.find(c => c.id === componentId);
                this.openConfigModal(component);
            });
        });
    }

    startInlineEdit(element, type = 'text') {
        const currentValue = element.textContent.trim();
        const field = element.dataset.field;
        const componentId = parseInt(element.closest('.template-component').dataset.componentId);
        
        // Create input or textarea element
        const input = type === 'textarea' ? 
            document.createElement('textarea') : 
            document.createElement('input');
        
        if (type !== 'textarea') {
            input.type = type;
        }
        input.value = currentValue;
        input.className = type === 'textarea' ? 'inline-edit-input form-textarea' : 'inline-edit-input form-input';
        
        // Style the input to match the element
        const computedStyle = window.getComputedStyle(element);
        input.style.fontSize = computedStyle.fontSize;
        input.style.fontWeight = computedStyle.fontWeight;
        input.style.background = 'var(--color-surface)';
        input.style.color = 'var(--color-text)';
        input.style.border = '1px solid var(--color-accent)';
        input.style.borderRadius = 'var(--radius-xs)';
        input.style.padding = '2px 4px';
        input.style.width = '100%';
        input.style.minWidth = '150px';
        input.style.fontFamily = 'inherit';
        
        if (type === 'textarea') {
            input.style.resize = 'vertical';
            input.style.minHeight = '60px';
            input.rows = 3;
        }
        
        // Replace element with input
        element.style.display = 'none';
        element.parentNode.insertBefore(input, element.nextSibling);
        
        // Focus and select
        input.focus();
        input.select();
        
        // Save on blur or Enter (Ctrl+Enter for textarea)
        const saveEdit = () => {
            const newValue = input.value.trim();
            if (newValue !== currentValue) {
                // Update component data
                const component = this.components.find(c => c.id === componentId);
                if (component) {
                    component.config[field] = newValue;
                    this.renderTemplateComponents();
                    this.updatePlaceholder();
                }
            } else {
                // Restore original
                element.style.display = '';
                input.remove();
            }
        };
        
        // Cancel on Escape
        const cancelEdit = () => {
            element.style.display = '';
            input.remove();
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (type === 'textarea') {
                // For textarea, save on Ctrl+Enter
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    saveEdit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                }
            } else {
                // For input, save on Enter
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveEdit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                }
            }
        });
    }

    startInlineExerciseEdit(element) {
        const currentValue = element.textContent.trim();
        const field = element.dataset.field;
        const exerciseIndex = parseInt(element.dataset.exerciseIndex);
        const componentId = parseInt(element.closest('.template-component').dataset.componentId);
        
        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'inline-edit-input';
        
        // Style the input to match the element
        const computedStyle = window.getComputedStyle(element);
        input.style.fontSize = computedStyle.fontSize;
        input.style.fontWeight = computedStyle.fontWeight;
        input.style.color = computedStyle.color;
        input.style.background = 'transparent';
        input.style.border = '1px solid var(--color-accent)';
        input.style.borderRadius = 'var(--radius-xs)';
        input.style.padding = '2px 4px';
        input.style.width = '100%';
        input.style.minWidth = '100px';
        
        // Replace element with input
        element.style.display = 'none';
        element.parentNode.insertBefore(input, element.nextSibling);
        
        // Focus and select
        input.focus();
        input.select();
        
        // Save on blur or Enter
        const saveEdit = () => {
            const newValue = input.value.trim();
            if (newValue && newValue !== currentValue) {
                // Update exercise data within the group
                const component = this.components.find(c => c.id === componentId);
                if (component && component.config.exercises[exerciseIndex]) {
                    component.config.exercises[exerciseIndex].config[field] = newValue;
                    this.renderTemplateComponents();
                    this.updatePlaceholder();
                }
            } else {
                // Restore original
                element.style.display = '';
                input.remove();
            }
        };
        
        // Cancel on Escape
        const cancelEdit = () => {
            element.style.display = '';
            input.remove();
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    }

    openConfigModal(component) {
        this.currentConfigComponent = component;
        const modal = document.getElementById('configModal');
        const overlay = document.getElementById('modalOverlay');
        const title = document.getElementById('configModalTitle');
        const body = document.getElementById('configModalBody');

        title.textContent = `Configure ${this.getComponentTypeName(component.type)}`;
        body.innerHTML = this.createConfigForm(component);

    modal.classList.add('active');
    overlay.classList.add('active');
    // Ensure overlay is interactive and visible (explicit inline styles help when cached CSS is stale)
    overlay.style.display = 'block';
    overlay.style.pointerEvents = 'auto';

        // Bind config form events
        this.bindConfigFormEvents(component);
        this.setupConfigFormListeners(component);
    }

    setupConfigFormListeners(component) {
        // Update schedule type visibility
        const scheduleTypeRadios = document.querySelectorAll('input[name="scheduleType"]');
        const daysOfWeekSection = document.getElementById('daysOfWeekSection');
        
        if (scheduleTypeRadios.length > 0 && daysOfWeekSection) {
            scheduleTypeRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    daysOfWeekSection.style.display = radio.value === 'specific' ? 'block' : 'none';
                });
            });
        }

        // Update day checkboxes to fix the label structure
        const dayCheckboxes = document.querySelectorAll('.day-checkbox input[type="checkbox"]');
        dayCheckboxes.forEach(checkbox => {
            if (!checkbox.nextElementSibling || checkbox.nextElementSibling.tagName !== 'SPAN') {
                const span = document.createElement('span');
                span.textContent = checkbox.value;
                checkbox.parentNode.appendChild(span);
            }
        });

        // Setup times per day listeners
        const enableTimesPerDayCheckbox = document.getElementById('enableTimesPerDay');
        const timesPerDayConfig = document.querySelector('.times-per-day-config');
        const timesPerDayCountSelect = document.getElementById('timesPerDayCount');
        
        if (enableTimesPerDayCheckbox && timesPerDayConfig) {
            enableTimesPerDayCheckbox.addEventListener('change', () => {
                timesPerDayConfig.style.display = enableTimesPerDayCheckbox.checked ? 'block' : 'none';
            });
        }
        
        if (timesPerDayCountSelect) {
            timesPerDayCountSelect.addEventListener('change', () => {
                const count = parseInt(timesPerDayCountSelect.value);
                const labelInputs = document.querySelectorAll('.time-label-input');
                labelInputs.forEach((input, index) => {
                    input.style.display = index < count ? 'block' : 'none';
                });
            });
        }
    }

    isExerciseScheduled(component, dayIndex) {
        if (!component.config.schedule) return true; // Default to scheduled if no schedule config
        
        const schedule = component.config.schedule;
        
        switch (schedule.type) {
            case 'daily':
                return true;
                
            case 'interval':
                const daysSinceStart = dayIndex - (schedule.startDay - 1);
                return daysSinceStart >= 0 && daysSinceStart % schedule.everyXDays === 0;
                
            case 'specific':
                const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const dayOfWeek = dayNames[dayIndex % 7];
                return schedule.daysOfWeek.includes(dayOfWeek);
                
            default:
                return true;
        }
    }

    getComponentTypeName(type) {
        const names = {
            'exercise-group': 'Exercise Group',
            'checkbox-exercise': 'Checkbox Exercise',
            'rating-exercise': 'Self-Rating Exercise',
            'repetition-exercise': 'Repetition Exercise',
            'time-exercise': 'Time-Based Exercise',
            'blank-exercise': 'Blank Exercise',
            'notes-section': 'Notes Section',
            'custom-header': 'Custom Header'
        };
        return names[type] || 'Component';
    }

    createConfigForm(component) {
        switch (component.type) {
            case 'exercise-group':
                return '<p>Exercise Groups can be configured by editing the title inline and using the gear icons (⚙️) to configure individual exercises.</p>';
            case 'checkbox-exercise':
                return this.createSimpleExerciseForm(component);
            case 'rating-exercise':
                return this.createRatingExerciseForm(component);
            case 'repetition-exercise':
                return this.createRepetitionExerciseForm(component);
            case 'time-exercise':
                return this.createTimeExerciseForm(component);
            case 'blank-exercise':
                return this.createBlankExerciseForm(component);
            case 'notes-section':
                return this.createNotesSectionForm(component);
            case 'custom-header':
                return this.createCustomHeaderForm(component);
            default:
                return '<p>No configuration available for this component.</p>';
        }
    }

    createSimpleExerciseForm(component) {
        return `
            <div class="config-form">
                <div class="form-group">
                    <label>Exercise Title:</label>
                    <input type="text" id="configTitle" value="${component.config.title}">
                </div>
                <div class="form-group">
                    <label>Description:</label>
                    <input type="text" id="configDescription" value="${component.config.description}">
                </div>
                ${this.createTimesPerDayForm(component)}
                ${this.createScheduleForm(component)}
            </div>
        `;
    }

    createRatingExerciseForm(component) {
        return `
            <div class="config-form">
                <div class="form-group">
                    <label>Exercise Title:</label>
                    <input type="text" id="configTitle" value="${component.config.title}">
                </div>
                <div class="form-group">
                    <label>Description:</label>
                    <input type="text" id="configDescription" value="${component.config.description}">
                </div>
                <div class="config-row">
                    <div class="form-group">
                        <label>Max Scale Degree (Rating from 1 to _):</label>
                        <input type="number" id="configScaleMax" value="${this.getMaxRatingValue(component)}" min="2" max="20" class="form-input">
                    </div>
                </div>
                ${this.createTimesPerDayForm(component)}
                ${this.createScheduleForm(component)}
            </div>
        `;
    }

    createRepetitionExerciseForm(component) {
        return `
            <div class="config-form">
                <div class="form-group">
                    <label>Exercise Title:</label>
                    <input type="text" id="configTitle" value="${component.config.title}">
                </div>
                <div class="form-group">
                    <label>Description:</label>
                    <input type="text" id="configDescription" value="${component.config.description}">
                </div>
                <div class="form-group">
                    <label>Target Repetitions:</label>
                    <input type="number" id="configTargetReps" value="${component.config.targetReps}" min="1">
                </div>
                ${this.createTimesPerDayForm(component)}
                ${this.createScheduleForm(component)}
            </div>
        `;
    }

    createTimeExerciseForm(component) {
        return `
            <div class="config-form">
                <div class="form-group">
                    <label>Exercise Title:</label>
                    <input type="text" id="configTitle" value="${component.config.title}">
                </div>
                <div class="form-group">
                    <label>Description:</label>
                    <input type="text" id="configDescription" value="${component.config.description}">
                </div>
                <div class="form-group">
                    <label>Target Time:</label>
                    <input type="text" id="configTargetTime" value="${component.config.targetTime}" placeholder="e.g., 15 minutes">
                </div>
                ${this.createTimesPerDayForm(component)}
                ${this.createScheduleForm(component)}
            </div>
        `;
    }

    createBlankExerciseForm(component) {
        return `
            <div class="config-form">
                <div class="form-group">
                    <label>Exercise Title:</label>
                    <input type="text" id="configTitle" value="${component.config.title}">
                </div>
                <div class="form-group">
                    <label>Description:</label>
                    <input type="text" id="configDescription" value="${component.config.description}">
                </div>
                ${this.createTimesPerDayForm(component)}
                ${this.createScheduleForm(component)}
            </div>
        `;
    }

    createNotesSectionForm(component) {
        return `
            <div class="config-form">
                <div class="form-group">
                    <label>Section Title:</label>
                    <input type="text" id="configTitle" value="${component.config.title}">
                </div>
                <div class="form-group">
                    <label>Description:</label>
                    <input type="text" id="configDescription" value="${component.config.description}">
                </div>
            </div>
        `;
    }

    createCustomHeaderForm(component) {
        return `
            <div class="config-form">
                <div class="form-group">
                    <label>Header Title:</label>
                    <input type="text" id="configTitle" value="${component.config.title}">
                </div>
                <div class="form-group">
                    <label>Description/Comments:</label>
                    <textarea id="configDescription" rows="4" class="form-textarea">${component.config.description || ''}</textarea>
                </div>
            </div>
        `;
    }

    createScheduleForm(component) {
        if (!component.config.schedule) return '';
        
        const schedule = component.config.schedule;
        const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dayCheckboxes = daysOfWeek.map(day => `
            <label class="day-checkbox">
                <input type="checkbox" value="${day}" ${schedule.daysOfWeek.includes(day) ? 'checked' : ''}>
                <span>${day}</span>
            </label>
        `).join('');

        return `
            <div class="form-group schedule-section">
                <label>Exercise Schedule:</label>
                <div class="schedule-options">
                    <label class="schedule-option">
                        <input type="radio" name="scheduleType" value="daily" ${schedule.type === 'daily' ? 'checked' : ''}>
                        Daily
                    </label>
                    <label class="schedule-option">
                        <input type="radio" name="scheduleType" value="interval" ${schedule.type === 'interval' ? 'checked' : ''}>
                        Every 
                        <input type="number" id="configEveryXDays" value="${schedule.everyXDays}" min="1" max="7" style="width: 60px; margin: 0 5px;">
                        day(s), starting on day 
                        <input type="number" id="configStartDay" value="${schedule.startDay}" min="1" style="width: 60px; margin-left: 5px;">
                    </label>
                    <label class="schedule-option">
                        <input type="radio" name="scheduleType" value="specific" ${schedule.type === 'specific' ? 'checked' : ''}>
                        Specific days of the week
                    </label>
                </div>
                <div class="days-of-week" id="daysOfWeekSection" style="display: ${schedule.type === 'specific' ? 'block' : 'none'};">
                    ${dayCheckboxes}
                </div>
            </div>
        `;
    }

    createTimesPerDayForm(component) {
        if (!component.config.timesPerDay) return '';
        
        const timesPerDay = component.config.timesPerDay;
        const labelInputs = [];
        
        for (let i = 0; i < 5; i++) {
            const value = timesPerDay.labels[i] || '';
            const display = i < timesPerDay.count ? 'block' : 'none';
            labelInputs.push(`
                <div class="time-label-input" style="display: ${display};">
                    <label>Time ${i + 1}:</label>
                    <input type="text" id="timeLabel${i}" value="${value}" placeholder="e.g., AM, 8am, Morning">
                </div>
            `);
        }

        return `
            <div class="form-group times-per-day-section">
                <label>
                    <input type="checkbox" id="enableTimesPerDay" ${timesPerDay.enabled ? 'checked' : ''}>
                    Track multiple times per day
                </label>
                <div class="times-per-day-config" style="display: ${timesPerDay.enabled ? 'block' : 'none'};">
                    <div class="form-group">
                        <label>Number of times per day (1-5):</label>
                        <select id="timesPerDayCount">
                            ${[1,2,3,4,5].map(num => 
                                `<option value="${num}" ${timesPerDay.count === num ? 'selected' : ''}>${num}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="time-labels-container">
                        ${labelInputs.join('')}
                    </div>
                </div>
            </div>
        `;
    }

    bindConfigFormEvents(component) {
        if (component.type === 'exercise-group') {
            // Add exercise button
            document.getElementById('addExercise').addEventListener('click', () => {
                const newExerciseType = document.getElementById('newExerciseType').value;
                const newExercise = {
                    id: 'ex' + Date.now(),
                    type: newExerciseType,
                    config: this.getDefaultConfig(newExerciseType)
                };
                
                // Add to the component's exercises array
                component.config.exercises.push(newExercise);
                
                // Regenerate the form
                const modalBody = document.getElementById('configModalBody');
                modalBody.innerHTML = this.createConfigForm(component);
                this.bindConfigFormEvents(component);
                this.setupConfigFormListeners(component);
            });

            this.bindExerciseItemEvents(component);
        }
    }

    bindExerciseItemEvents(component) {
        // Remove exercise buttons
        document.querySelectorAll('.remove-exercise').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.exerciseIndex);
                component.config.exercises.splice(index, 1);
                
                // Regenerate the form
                const modalBody = document.getElementById('configModalBody');
                modalBody.innerHTML = this.createConfigForm(component);
                this.bindConfigFormEvents(component);
                this.setupConfigFormListeners(component);
            });
        });

        // Configure exercise buttons
        document.querySelectorAll('.configure-exercise').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.exerciseIndex);
                const exercise = component.config.exercises[index];
                this.openExerciseSubConfig(exercise, component, index);
            });
        });

        // Update exercise titles, descriptions, and types
        document.querySelectorAll('[data-exercise-field]').forEach(input => {
            input.addEventListener('input', (e) => {
                const item = e.target.closest('.exercise-item');
                const index = parseInt(item.dataset.exerciseIndex);
                const field = e.target.dataset.exerciseField;
                
                if (field === 'type') {
                    // Handle exercise type change
                    const newType = e.target.value;
                    const currentExercise = component.config.exercises[index];
                    
                    // Preserve title and description but update type and config
                    const title = currentExercise.config.title;
                    const description = currentExercise.config.description;
                    
                    component.config.exercises[index] = {
                        id: currentExercise.id,
                        type: newType,
                        config: {
                            ...this.getDefaultConfig(newType),
                            title: title,
                            description: description
                        }
                    };
                    
                    // Refresh the form to show the updated exercise
                    const body = document.getElementById('configModalBody');
                    body.innerHTML = this.createConfigForm(component);
                    this.bindConfigFormEvents(component);
                } else {
                    // Handle other field changes (title, description)
                    component.config.exercises[index].config[field] = e.target.value;
                }
            });
        });
    }

    saveComponentConfig() {
        // Check if we're creating an exercise group
        if (this.isCreatingExerciseGroup) {
            this.createExerciseGroup();
            return;
        }

        if (!this.currentConfigComponent) return;

        const component = this.currentConfigComponent;
        
        // Get common fields
        const titleInput = document.getElementById('configTitle');
        if (titleInput) component.config.title = titleInput.value;

        const descriptionInput = document.getElementById('configDescription');
        if (descriptionInput) component.config.description = descriptionInput.value;

        // Get component-specific fields
        switch (component.type) {
            case 'rating-exercise':
                const scaleMax = document.getElementById('configScaleMax');
                if (scaleMax) component.config.scaleMax = parseInt(scaleMax.value) || 5;
                break;

            case 'repetition-exercise':
                const targetReps = document.getElementById('configTargetReps');
                if (targetReps) component.config.targetReps = parseInt(targetReps.value);
                break;

            case 'time-exercise':
                const targetTime = document.getElementById('configTargetTime');
                if (targetTime) component.config.targetTime = targetTime.value;
                break;

            case 'custom-header':
                const headerDescription = document.getElementById('configDescription');
                if (headerDescription) component.config.description = headerDescription.value;
                break;
        }

        // Handle schedule configuration for exercises
        if (component.config.schedule) {
            const scheduleTypeRadio = document.querySelector('input[name="scheduleType"]:checked');
            if (scheduleTypeRadio) {
                component.config.schedule.type = scheduleTypeRadio.value;
                
                if (scheduleTypeRadio.value === 'interval') {
                    const everyXDaysInput = document.getElementById('configEveryXDays');
                    const startDayInput = document.getElementById('configStartDay');
                    if (everyXDaysInput) component.config.schedule.everyXDays = parseInt(everyXDaysInput.value);
                    if (startDayInput) component.config.schedule.startDay = parseInt(startDayInput.value);
                } else if (scheduleTypeRadio.value === 'specific') {
                    const checkedDays = Array.from(document.querySelectorAll('.day-checkbox input[type="checkbox"]:checked'))
                                           .map(cb => cb.value);
                    component.config.schedule.daysOfWeek = checkedDays;
                }
            }
        }

        // Handle times per day configuration for exercises
        if (component.config.timesPerDay) {
            const enableTimesPerDayCheckbox = document.getElementById('enableTimesPerDay');
            if (enableTimesPerDayCheckbox) {
                component.config.timesPerDay.enabled = enableTimesPerDayCheckbox.checked;
                
                const timesPerDayCountSelect = document.getElementById('timesPerDayCount');
                if (timesPerDayCountSelect) {
                    component.config.timesPerDay.count = parseInt(timesPerDayCountSelect.value);
                }
                
                // Save time labels
                const labels = [];
                for (let i = 0; i < 5; i++) {
                    const labelInput = document.getElementById(`timeLabel${i}`);
                    if (labelInput) {
                        labels.push(labelInput.value || '');
                    }
                }
                component.config.timesPerDay.labels = labels;
            }
        }

        // If we're editing an exercise from a group, save it back to the group
        if (this.editingExerciseGroup && this.editingExerciseIndex !== undefined) {
            this.editingExerciseGroup.config.exercises[this.editingExerciseIndex] = component;
            this.editingExerciseGroup = null;
            this.editingExerciseIndex = undefined;
        }

        // If this is a new component being created, add it to the components array
        if (this.isCreatingComponent) {
            this.components.push(component);
            this.isCreatingComponent = false;
            this.updatePlaceholder();
        }

        // If this is a new group exercise being created, add it to the group
        if (this.isCreatingGroupExercise) {
            const group = this.components.find(c => c.id === this.targetGroupId);
            if (group && group.type === 'exercise-group') {
                group.config.exercises.push(component);
            }
            this.isCreatingGroupExercise = false;
            this.pendingGroupExercise = null;
            this.targetGroupId = null;
        }

        this.renderTemplateComponents();
        this.closeConfigModal();
    }

    closeConfigModal() {
        // If we were creating a new component and it gets cancelled, don't add it
        if (this.isCreatingComponent) {
            this.isCreatingComponent = false;
            // Component was never added to the array, so no need to remove it
        }

        // If we were creating a new group exercise and it gets cancelled, don't add it
        if (this.isCreatingGroupExercise) {
            this.isCreatingGroupExercise = false;
            this.pendingGroupExercise = null;
            this.targetGroupId = null;
        }
        
    document.getElementById('configModal').classList.remove('active');
    const overlayEl = document.getElementById('modalOverlay');
    overlayEl.classList.remove('active');
    overlayEl.style.display = 'none';
    overlayEl.style.pointerEvents = 'none';
        this.currentConfigComponent = null;
        
        // Clear exercise group editing state
        this.editingExerciseGroup = null;
        this.editingExerciseIndex = undefined;
        
        // Clear exercise group creation flag
        this.isCreatingExerciseGroup = false;
    }

    deleteComponent(componentId) {
        this.components = this.components.filter(c => c.id !== componentId);
        this.renderTemplateComponents();
        this.updatePlaceholder();
    }

    clearTemplate() {
        this.components = [];
        this.renderTemplateComponents();
        this.updatePlaceholder();
    }

    updatePlaceholder() {
        const placeholder = document.querySelector('.dropzone-placeholder');
        if (this.components.length > 0) {
            placeholder.classList.add('hidden');
        } else {
            placeholder.classList.remove('hidden');
        }
    }

    togglePreviewMode() {
        const mainContainer = document.querySelector('.main-container');
        const printArea = document.getElementById('printArea');
        const previewBtn = document.getElementById('previewMode');

        if (printArea.style.display === 'none' || !printArea.style.display) {
            // Entering preview mode - generate content and show preview
            this.generatePrintContent();
            mainContainer.style.display = 'none';
            printArea.style.display = 'block';
            previewBtn.textContent = 'Back to Edit';
        } else {
            // Returning to edit mode - just hide preview, keep all data
            mainContainer.style.display = 'block';
            printArea.style.display = 'none';
            previewBtn.textContent = 'Preview Mode';
        }
    }

    updatePreview() {
        // Update print header information
        const clientName = document.getElementById('clientName').value || '_________________';
        const clinicianName = document.getElementById('clinicianName').value || '_________________';
        const logTitle = document.getElementById('logTitle').value || 'Home Program Log';
        const startDate = document.getElementById('startDate').value || '_________________';

        document.getElementById('printClientName').textContent = clientName;
        document.getElementById('printClinicianName').textContent = clinicianName;
        document.getElementById('printLogTitle').textContent = logTitle;
        document.getElementById('printStartDate').textContent = this.formatDateForDisplay(startDate);
    }

    formatDateForDisplay(dateString) {
        if (!dateString || dateString === '_________________') return '_________________';
        
        try {
            // Parse the date string manually to avoid timezone issues
            const [year, month, day] = dateString.split('-').map(Number);
            const date = new Date(year, month - 1, day); // month is 0-indexed
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    getDateLabel(startDateString, dayOffset) {
        if (!startDateString) {
            return `Day ${dayOffset + 1}`;
        }
        
        try {
            // Parse the date string manually to avoid timezone issues
            const [year, month, day] = startDateString.split('-').map(Number);
            const startDate = new Date(year, month - 1, day); // month is 0-indexed
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + dayOffset);
            
            // Format as "Mon 9/15"
            const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
            const displayMonth = currentDate.getMonth() + 1;
            const displayDay = currentDate.getDate();
            
            return `${dayName} ${displayMonth}/${displayDay}`;
        } catch (error) {
            return `Day ${dayOffset + 1}`;
        }
    }

    getDateForOffset(startDateString, dayOffset) {
        if (!startDateString) return null;
        
        try {
            // Parse the date string manually to avoid timezone issues
            const [year, month, day] = startDateString.split('-').map(Number);
            const startDate = new Date(year, month - 1, day); // month is 0-indexed
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + dayOffset);
            return currentDate;
        } catch (error) {
            return null;
        }
    }

    formatDateShort(date) {
        if (!date) return '';
        
        try {
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `${month}/${day}`;
        } catch (error) {
            return '';
        }
    }

    generatePrintContent() {
        this.updatePreview();
        
        const printContent = document.getElementById('printContent');
        const numWeeks = parseInt(document.getElementById('numWeeks').value);
        const numDays = numWeeks * 7;
        
        let contentHTML = '';

        // Always use weekly grouped structure for consistency
        contentHTML = this.generateWeeklyGroupedContent(numDays, numWeeks);

        printContent.innerHTML = contentHTML;
    }

    generateWeeklyGroupedContent(numDays, numWeeks) {
        const startDate = document.getElementById('startDate').value;
        let contentHTML = '';

        for (let week = 0; week < numWeeks; week++) {
            const weekStart = week * 7;
            const weekDays = 7; // Always 7 days per week for consistency
            
            const weekStartDate = this.getDateForOffset(startDate, weekStart);
            const weekEndDate = this.getDateForOffset(startDate, weekStart + 6);
            const weekTitle = `Week ${week + 1} (${this.formatDateShort(weekStartDate)} - ${this.formatDateShort(weekEndDate)})`;
            
            contentHTML += `<div class="week-section">`;
            contentHTML += `<div class="week-header">${weekTitle}</div>`;
            
            // Generate all components for this week
            this.components.forEach(component => {
                contentHTML += this.generateComponentWeekHTML(component, weekStart, weekDays, startDate);
            });
            
            contentHTML += `</div>`;
        }

        return contentHTML;
    }

    generateComponentWeekHTML(component, weekStart, weekDays, startDate) {
        switch (component.type) {
            case 'exercise-group':
                return this.generateExerciseGroupWeekTable(component, weekStart, weekDays, startDate);
            case 'checkbox-exercise':
                return this.generateSimpleExerciseWeekTable(component, 'checkbox', weekStart, weekDays, startDate);
            case 'rating-exercise':
                return this.generateSimpleExerciseWeekTable(component, 'rating', weekStart, weekDays, startDate);
            case 'repetition-exercise':
                return this.generateSimpleExerciseWeekTable(component, 'repetitions', weekStart, weekDays, startDate);
            case 'time-exercise':
                return this.generateSimpleExerciseWeekTable(component, 'time', weekStart, weekDays, startDate);
            case 'blank-exercise':
                return this.generateSimpleExerciseWeekTable(component, 'blank', weekStart, weekDays, startDate);
            case 'notes-section':
                return this.generateNotesSection(component);
            case 'custom-header':
                return this.generateCustomHeader(component);
            default:
                return '';
        }
    }

    generateExerciseGroupWeekTable(component, weekStart, weekDays, startDate) {
        const { title, exercises } = component.config;
        
        let headerCells = '<th class="exercise-name">Exercise</th>';
        for (let i = 0; i < weekDays; i++) {
            const dateLabel = this.getDateLabel(startDate, weekStart + i);
            headerCells += `<th>${dateLabel}</th>`;
        }

        let exerciseRows = '';
        exercises.forEach(exercise => {
            const exerciseTitle = exercise.config.title;
            const exerciseDescription = exercise.config.description;
            const exerciseInfo = `${exerciseTitle}<br><small>${exerciseDescription}</small>`;
            
            let cells = `<td class="exercise-name">${exerciseInfo}</td>`;
            for (let i = 0; i < weekDays; i++) {
                const dayIndex = weekStart + i;
                const isScheduled = this.isExerciseScheduled(exercise, dayIndex);
                const trackingType = this.getExerciseTrackingType(exercise);
                const cellClass = this.getCellClass(trackingType, isScheduled);
                const cellContent = this.getCellContent(trackingType, exercise, isScheduled);
                cells += `<td class="${cellClass}">${cellContent}</td>`;
            }
            exerciseRows += `<tr>${cells}</tr>`;
        });

        return `
            <div class="section-header">${title}</div>
            <table class="exercise-table">
                <thead>
                    <tr>${headerCells}</tr>
                </thead>
                <tbody>
                    ${exerciseRows}
                </tbody>
            </table>
        `;
    }

    generateSimpleExerciseWeekTable(component, trackingType, weekStart, weekDays, startDate) {
        const { title, description } = component.config;
        
        let headerCells = '<th class="exercise-name">Exercise</th>';
        for (let i = 0; i < weekDays; i++) {
            const dateLabel = this.getDateLabel(startDate, weekStart + i);
            headerCells += `<th>${dateLabel}</th>`;
        }

        // Add target information for specific exercise types
        let exerciseInfo = `${title}<br><small>${description}</small>`;
        if (component.type === 'repetition-exercise' && component.config.targetReps) {
            exerciseInfo += `<br><strong>Target: ${component.config.targetReps} reps</strong>`;
        } else if (component.type === 'time-exercise' && component.config.targetTime) {
            exerciseInfo += `<br><strong>Target: ${component.config.targetTime}</strong>`;
        }

        let cells = `<td class="exercise-name">${exerciseInfo}</td>`;
        for (let i = 0; i < weekDays; i++) {
            const dayIndex = weekStart + i;
            const isScheduled = this.isExerciseScheduled(component, dayIndex);
            const cellClass = this.getCellClass(trackingType, isScheduled);
            const cellContent = this.getCellContent(trackingType, component, isScheduled);
            cells += `<td class="${cellClass}">${cellContent}</td>`;
        }

        return `
            <table class="exercise-table">
                <thead>
                    <tr>${headerCells}</tr>
                </thead>
                <tbody>
                    <tr>${cells}</tr>
                </tbody>
            </table>
        `;
    }

    generateComponentPrintHTML(component, numDays) {
        switch (component.type) {
            case 'exercise-group':
                return this.generateExerciseGroupTable(component, numDays);
            case 'checkbox-exercise':
                return this.generateSimpleExerciseTable(component, numDays, 'checkbox');
            case 'rating-exercise':
                return this.generateSimpleExerciseTable(component, numDays, 'rating');
            case 'repetition-exercise':
                return this.generateSimpleExerciseTable(component, numDays, 'repetitions');
            case 'time-exercise':
                return this.generateSimpleExerciseTable(component, numDays, 'time');
            case 'blank-exercise':
                return this.generateSimpleExerciseTable(component, numDays, 'blank');
            case 'notes-section':
                return this.generateNotesSection(component);
            case 'custom-header':
                return this.generateCustomHeader(component);
            default:
                return '';
        }
    }

    generateExerciseGroupTable(component, numDays) {
        const { title, exercises } = component.config;
        const startDate = document.getElementById('startDate').value;
        
        // If 7 days or less, use single table
        if (numDays <= 7) {
            return this.generateSingleWeekGroupTable(component, numDays, startDate);
        }
        
        // For longer periods, create weekly sections
        const weeks = Math.ceil(numDays / 7);
        let tablesHTML = `<div class="section-header">${title}</div>`;
        
        for (let week = 0; week < weeks; week++) {
            const weekStart = week * 7;
            const weekEnd = Math.min(weekStart + 7, numDays);
            const weekDays = weekEnd - weekStart;
            
            const weekStartDate = this.getDateForOffset(startDate, weekStart);
            const weekEndDate = this.getDateForOffset(startDate, weekEnd - 1);
            const weekTitle = `Week ${week + 1} (${this.formatDateShort(weekStartDate)} - ${this.formatDateShort(weekEndDate)})`;
            
            tablesHTML += this.generateWeeklyGroupTable(component, startDate, weekStart, weekDays, weekTitle);
        }
        
        return tablesHTML;
    }

    generateSingleWeekGroupTable(groupComponent, numDays, startDate) {
        const { title, exercises } = groupComponent.config;
        
        let headerCells = '<th class="exercise-name">Exercise</th>';
        for (let i = 0; i < numDays; i++) {
            const dateLabel = this.getDateLabel(startDate, i);
            headerCells += `<th>${dateLabel}</th>`;
        }

        let exerciseRows = '';
        exercises.forEach(exerciseComponent => {
            const exerciseTitle = exerciseComponent.config.title;
            const exerciseDescription = exerciseComponent.config.description;
            const exerciseInfo = `${exerciseTitle}<br><small>${exerciseDescription}</small>`;
            
            let cells = `<td class="exercise-name">${exerciseInfo}</td>`;
            for (let i = 0; i < numDays; i++) {
                const isScheduled = this.isExerciseScheduled(exerciseComponent, i);
                const cellClass = this.getCellClass(this.getExerciseTrackingType(exerciseComponent), isScheduled);
                const cellContent = this.getCellContent(this.getExerciseTrackingType(exerciseComponent), exerciseComponent, isScheduled);
                cells += `<td class="${cellClass}">${cellContent}</td>`;
            }
            exerciseRows += `<tr>${cells}</tr>`;
        });

        return `
            <div class="section-header">${title}</div>
            <table class="exercise-table">
                <thead>
                    <tr>${headerCells}</tr>
                </thead>
                <tbody>
                    ${exerciseRows}
                </tbody>
            </table>
        `;
    }

    generateWeeklyGroupTable(groupComponent, startDate, weekStart, weekDays, weekTitle) {
        const { exercises } = groupComponent.config;
        
        let headerCells = '<th class="exercise-name">Exercise</th>';
        for (let i = 0; i < weekDays; i++) {
            const dateLabel = this.getDateLabel(startDate, weekStart + i);
            headerCells += `<th>${dateLabel}</th>`;
        }

        let exerciseRows = '';
        exercises.forEach(exerciseComponent => {
            const exerciseTitle = exerciseComponent.config.title;
            const exerciseDescription = exerciseComponent.config.description;
            const exerciseInfo = `${exerciseTitle}<br><small>${exerciseDescription}</small>`;
            
            let cells = `<td class="exercise-name">${exerciseInfo}</td>`;
            for (let i = 0; i < weekDays; i++) {
                const isScheduled = this.isExerciseScheduled(exerciseComponent, weekStart + i);
                const cellClass = this.getCellClass(this.getExerciseTrackingType(exerciseComponent), isScheduled);
                const cellContent = this.getCellContent(this.getExerciseTrackingType(exerciseComponent), exerciseComponent, isScheduled);
                cells += `<td class="${cellClass}">${cellContent}</td>`;
            }
            exerciseRows += `<tr>${cells}</tr>`;
        });

        return `
            <div class="week-header">${weekTitle}</div>
            <table class="exercise-table">
                <thead>
                    <tr>${headerCells}</tr>
                </thead>
                <tbody>
                    ${exerciseRows}
                </tbody>
            </table>
        `;
    }

    getExerciseTrackingType(exerciseComponent) {
        switch (exerciseComponent.type) {
            case 'checkbox-exercise':
                return 'checkbox';
            case 'rating-exercise':
                return 'rating';
            case 'repetition-exercise':
                return 'repetition';
            case 'time-exercise':
                return 'time';
            case 'blank-exercise':
                return 'blank';
            default:
                return 'checkbox';
        }
    }

    generateSimpleExerciseTable(component, numDays, trackingType) {
        const { title, description } = component.config;
        const startDate = document.getElementById('startDate').value;
        
        // If 7 days or less, use single table
        if (numDays <= 7) {
            return this.generateSingleWeekSimpleTable(component, numDays, startDate, title, description, trackingType);
        }
        
        // For longer periods, create weekly sections
        const weeks = Math.ceil(numDays / 7);
        let tablesHTML = '';
        
        for (let week = 0; week < weeks; week++) {
            const weekStart = week * 7;
            const weekEnd = Math.min(weekStart + 7, numDays);
            const weekDays = weekEnd - weekStart;
            
            const weekStartDate = this.getDateForOffset(startDate, weekStart);
            const weekEndDate = this.getDateForOffset(startDate, weekEnd - 1);
            const weekTitle = `Week ${week + 1} (${this.formatDateShort(weekStartDate)} - ${this.formatDateShort(weekEndDate)})`;
            
            tablesHTML += this.generateWeeklySimpleTable(component, title, description, trackingType, startDate, weekStart, weekDays, weekTitle);
        }
        
        return tablesHTML;
    }

    generateSingleWeekTable(component, numDays, startDate, title, exercises, trackingType) {
        let headerCells = '<th class="exercise-name">Exercise</th>';
        for (let i = 0; i < numDays; i++) {
            const dateLabel = this.getDateLabel(startDate, i);
            headerCells += `<th>${dateLabel}</th>`;
        }

        let exerciseRows = '';
        exercises.forEach(exercise => {
            let cells = `<td class="exercise-name">${exercise}</td>`;
            for (let i = 0; i < numDays; i++) {
                const isScheduled = this.isExerciseScheduled(component, i);
                const cellClass = this.getCellClass(trackingType, isScheduled);
                const cellContent = this.getCellContent(trackingType, component, isScheduled);
                cells += `<td class="${cellClass}">${cellContent}</td>`;
            }
            exerciseRows += `<tr>${cells}</tr>`;
        });

        return `
            <div class="section-header">${title}</div>
            <table class="exercise-table">
                <thead>
                    <tr>${headerCells}</tr>
                </thead>
                <tbody>
                    ${exerciseRows}
                </tbody>
            </table>
        `;
    }

    generateWeeklyTable(exercises, trackingType, startDate, weekStart, weekDays, weekTitle) {
        let headerCells = '<th class="exercise-name">Exercise</th>';
        for (let i = 0; i < weekDays; i++) {
            const dateLabel = this.getDateLabel(startDate, weekStart + i);
            headerCells += `<th>${dateLabel}</th>`;
        }

        let exerciseRows = '';
        exercises.forEach(exercise => {
            let cells = `<td class="exercise-name">${exercise}</td>`;
            for (let i = 0; i < weekDays; i++) {
                // For exercise groups, we default to scheduled (could be enhanced to support per-exercise scheduling)
                const cellClass = this.getCellClass(trackingType, true);
                const cellContent = this.getCellContent(trackingType, null, true);
                cells += `<td class="${cellClass}">${cellContent}</td>`;
            }
            exerciseRows += `<tr>${cells}</tr>`;
        });

        return `
            <div class="week-header">${weekTitle}</div>
            <table class="exercise-table">
                <thead>
                    <tr>${headerCells}</tr>
                </thead>
                <tbody>
                    ${exerciseRows}
                </tbody>
            </table>
        `;
    }

    generateSingleWeekSimpleTable(component, numDays, startDate, title, description, trackingType) {
        let headerCells = '<th class="exercise-name">Exercise</th>';
        for (let i = 0; i < numDays; i++) {
            const dateLabel = this.getDateLabel(startDate, i);
            headerCells += `<th>${dateLabel}</th>`;
        }

        // Add target information for specific exercise types
        let exerciseInfo = `${title}<br><small>${description}</small>`;
        if (component.type === 'repetition-exercise' && component.config.targetReps) {
            exerciseInfo += `<br><strong>Target: ${component.config.targetReps} reps</strong>`;
        } else if (component.type === 'time-exercise' && component.config.targetTime) {
            exerciseInfo += `<br><strong>Target: ${component.config.targetTime}</strong>`;
        }

        let cells = `<td class="exercise-name">${exerciseInfo}</td>`;
        for (let i = 0; i < numDays; i++) {
            const isScheduled = this.isExerciseScheduled(component, i);
            const cellClass = this.getCellClass(trackingType, isScheduled);
            const cellContent = this.getCellContent(trackingType, component, isScheduled);
            cells += `<td class="${cellClass}">${cellContent}</td>`;
        }

        return `
            <table class="exercise-table">
                <thead>
                    <tr>${headerCells}</tr>
                </thead>
                <tbody>
                    <tr>${cells}</tr>
                </tbody>
            </table>
        `;
    }

    generateWeeklySimpleTable(component, title, description, trackingType, startDate, weekStart, weekDays, weekTitle) {
        let headerCells = '<th class="exercise-name">Exercise</th>';
        for (let i = 0; i < weekDays; i++) {
            const dateLabel = this.getDateLabel(startDate, weekStart + i);
            headerCells += `<th>${dateLabel}</th>`;
        }

        // Add target information for specific exercise types
        let exerciseInfo = `${title}<br><small>${description}</small>`;
        if (component.type === 'repetition-exercise' && component.config.targetReps) {
            exerciseInfo += `<br><strong>Target: ${component.config.targetReps} reps</strong>`;
        } else if (component.type === 'time-exercise' && component.config.targetTime) {
            exerciseInfo += `<br><strong>Target: ${component.config.targetTime}</strong>`;
        }

        let cells = `<td class="exercise-name">${exerciseInfo}</td>`;
        for (let i = 0; i < weekDays; i++) {
            const dayIndex = weekStart + i;
            const isScheduled = this.isExerciseScheduled(component, dayIndex);
            const cellClass = this.getCellClass(trackingType, isScheduled);
            const cellContent = this.getCellContent(trackingType, component, isScheduled);
            cells += `<td class="${cellClass}">${cellContent}</td>`;
        }

        return `
            <div class="week-header">${weekTitle}</div>
            <table class="exercise-table">
                <thead>
                    <tr>${headerCells}</tr>
                </thead>
                <tbody>
                    <tr>${cells}</tr>
                </tbody>
            </table>
        `;
    }

    getCellClass(trackingType, isScheduled = true) {
        const classes = {
            'checkbox': 'checkbox-cell',
            'rating': 'rating-cell',
            'repetitions': 'rating-cell',
            'time': 'notes-cell',
            'blank': 'notes-cell'
        };
        let className = classes[trackingType] || 'notes-cell';
        if (!isScheduled) {
            className += ' not-scheduled';
        }
        return className;
    }

    getCellContent(trackingType, component = null, isScheduled = true) {
        if (!isScheduled) {
            return ''; // Empty content for non-scheduled cells
        }
        
        // Check if component has times per day enabled
        const hasTimesPerDay = component && component.config.timesPerDay && component.config.timesPerDay.enabled;
        
        if (hasTimesPerDay) {
            return this.generateTimesPerDayContent(trackingType, component);
        }
        
        // Standard single tracking content
        if (trackingType === 'rating' && component) {
            // Use scaleMax if available, otherwise fall back to scaleType for backward compatibility
            let maxRating = component.config.scaleMax;
            if (!maxRating && component.config.scaleType) {
                maxRating = component.config.scaleType === '1-10' ? 10 : 5;
            }
            maxRating = maxRating || 5; // Default to 5 if nothing is set
            return `__/${maxRating}`;
        }
        
        const content = {
            'checkbox': '☐',
            'rating': '__/5',
            'repetitions': '___',
            'time': '____min',
            'blank': ''
        };
        return content[trackingType] || '';
    }

    generateTimesPerDayContent(trackingType, component) {
        const timesPerDay = component.config.timesPerDay;
        const count = timesPerDay.count;
        const labels = timesPerDay.labels;
        
        let content = '<div class="times-per-day-cell">';
        
        for (let i = 0; i < count; i++) {
            const label = labels[i] || '';
            let trackingContent = '';
            
            switch (trackingType) {
                case 'checkbox':
                    trackingContent = '☐';
                    break;
                case 'rating':
                    // Use scaleMax if available, otherwise fall back to scaleType for backward compatibility
                    let maxRating = component.config.scaleMax;
                    if (!maxRating && component.config.scaleType) {
                        maxRating = component.config.scaleType === '1-10' ? 10 : 5;
                    }
                    maxRating = maxRating || 5; // Default to 5 if nothing is set
                    trackingContent = `__/${maxRating}`;
                    break;
                case 'repetitions':
                    trackingContent = '___';
                    break;
                case 'time':
                    trackingContent = '____min';
                    break;
                case 'blank':
                    trackingContent = '';
                    break;
                default:
                    trackingContent = '___';
            }
            
            // Only show label with colon if there's actually a label
            if (label.trim()) {
                content += `<div class="time-slot"><span class="time-label">${label}:</span> ${trackingContent}</div>`;
            } else {
                content += `<div class="time-slot">${trackingContent}</div>`;
            }
        }
        
        content += '</div>';
        return content;
    }

    generateNotesSection(component) {
        const { title, description } = component.config;
        
        return `
            <div class="notes-section">
                <div class="notes-header">${title}</div>
                <div class="notes-content">
                    <em>${description}</em>
                    <br><br>
                    ________________________________________________________________<br>
                    ________________________________________________________________<br>
                    ________________________________________________________________<br>
                    ________________________________________________________________<br>
                </div>
            </div>
        `;
    }

    generateCustomHeader(component) {
        const { title, description } = component.config;
        
        return `
            <div class="section-header">
                ${title}
                ${description ? `<div style="font-size: 0.9em; font-weight: normal; margin-top: 8px; white-space: pre-wrap;">${description}</div>` : ''}
            </div>
        `;
    }

    printLog() {
        // Always generate fresh content before printing
        this.generatePrintContent();
        
        // Ensure we're in preview mode for printing
        const mainContainer = document.querySelector('.main-container');
        const printArea = document.getElementById('printArea');
        const wasInEditMode = printArea.style.display === 'none' || !printArea.style.display;
        
        if (wasInEditMode) {
            mainContainer.style.display = 'none';
            printArea.style.display = 'block';
        }
        
        // Print the page using DomUtils to support Electron PDF preview
        try {
            const printAreaHtml = printArea.innerHTML;
            const headHtml = DomUtils && typeof DomUtils.getDefaultPrintHead === 'function' ? DomUtils.getDefaultPrintHead() : '';
            if (window.DomUtils && typeof DomUtils.openPrintWindow === 'function') {
                DomUtils.openPrintWindow({ title: 'Homework Print Log', bodyHtml: printAreaHtml, headHtml: headHtml, autoPrint: true });
            } else {
                window.print();
            }
        } catch (e) {
            console.error('Print failed', e);
            window.print();
        }
        
        // If we were in edit mode, return to it after printing
        if (wasInEditMode) {
            mainContainer.style.display = 'block';
            printArea.style.display = 'none';
        }
    }

    // Helper method to get the maximum rating value with backward compatibility
    getMaxRatingValue(component) {
        // Use scaleMax if available, otherwise fall back to scaleType for backward compatibility
        let maxRating = component.config.scaleMax;
        if (!maxRating && component.config.scaleType) {
            maxRating = component.config.scaleType === '1-10' ? 10 : 5;
        }
        return maxRating || 5; // Default to 5 if nothing is set
    }

    // End of HomeworkTracker class
}

// Initialize the Homework Tracker when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new HomeworkTracker();
    if (window.DomUtils) {
        DomUtils.initDefaultDates(['#startDate']);
    }
    
    // Set current year in footer if element exists
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});
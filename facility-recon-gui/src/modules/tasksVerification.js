import {
  store
} from '../store/store'
let componentsTasks = [{
  component: 'AddService',
  addTasks: ['facility_registry_can_add_service'],
  viewTasks: [],
  editTasks: [],
  deleteTasks: [],
  approveTasks: [],
  rejectTasks: []
}, {
  component: 'AddFacility',
  addTasks: ['facility_registry_can_add_facility'],
  viewTasks: [],
  editTasks: [],
  deleteTasks: [],
  approveTasks: [],
  rejectTasks: []
}, {
  component: 'AddJurisdiction',
  addTasks: ['facility_registry_can_add_jurisdiction'],
  viewTasks: [],
  editTasks: [],
  deleteTasks: [],
  approveTasks: [],
  rejectTasks: []
}, {
  component: 'AddCodeSystem',
  addTasks: ['facility_registry_can_add_terminologies'],
  viewTasks: [],
  editTasks: [],
  deleteTasks: [],
  approveTasks: [],
  rejectTasks: []
}, {
  component: 'ServicesReport',
  addTasks: [],
  viewTasks: ['facility_registry_can_view_service'],
  editTasks: ['facility_registry_can_edit_service'],
  deleteTasks: ['facility_registry_can_delete_service'],
  approveTasks: [],
  rejectTasks: []
}, {
  component: 'FacilitiesReport',
  addTasks: [],
  viewTasks: ['facility_registry_can_view_facility'],
  editTasks: ['facility_registry_can_edit_facility'],
  deleteTasks: ['facility_registry_can_delete_facility'],
  approveTasks: [],
  rejectTasks: []
}, {
  component: 'NewFacilitiesRequestsReport',
  addTasks: [],
  viewTasks: ['facility_registry_can_view_new_facility_requests_report'],
  editTasks: ['facility_registry_can_edit_new_facility_request'],
  deleteTasks: ['facility_registry_can_delete_new_facility_request'],
  approveTasks: ['facility_registry_can_approve_new_facility_request'],
  rejectTasks: ['facility_registry_can_reject_new_facility_request']
}, {
  component: 'FacilitiesUpdateRequestsReport',
  addTasks: [],
  viewTasks: ['facility_registry_can_view_update_facility_details_requests_report'],
  editTasks: ['facility_registry_can_edit_update_facility_details_request'],
  deleteTasks: ['facility_registry_can_delete_update_facility_details_request'],
  approveTasks: ['facility_registry_can_approve_update_facility_details_requests'],
  rejectTasks: ['facility_registry_can_reject_update_facility_details_requests']
}, {
  component: 'RequestUpdateBuildingDetails',
  addTasks: ['facility_registry_can_request_update_of_facility_details'],
  viewTasks: ['facility_registry_can_request_update_of_facility_details'],
  editTasks: [],
  deleteTasks: [],
  approveTasks: [],
  rejectTasks: []
}, {
  component: 'RequestBuildingAddition',
  addTasks: ['facility_registry_can_request_new_facility'],
  viewTasks: [],
  editTasks: [],
  deleteTasks: [],
  approveTasks: [],
  rejectTasks: []
}]
export const tasksVerification = {
  canAdd: (component) => {
    if (store.state.auth.role === 'Admin') {
      return true
    }
    let roleTasks = store.state.auth.tasks
    let allowedTasks = []
    for (let componentTask of componentsTasks) {
      if (componentTask.component === component) {
        allowedTasks = componentTask.addTasks
        break
      }
    }
    if (allowedTasks.length === 0) {
      return true
    }
    let hasTask = false
    for (let allowedTask of allowedTasks) {
      for (let roleTask of roleTasks) {
        if (roleTask.name === allowedTask) {
          hasTask = true
          break
        }
      }
    }
    return hasTask
  },
  canView: (component) => {
    if (store.state.auth.role === 'Admin') {
      return true
    }
    let roleTasks = store.state.auth.tasks
    let allowedTasks = []
    for (let componentTask of componentsTasks) {
      if (componentTask.component === component) {
        allowedTasks = componentTask.viewTasks
        break
      }
    }
    if (allowedTasks.length === 0) {
      return true
    }
    let hasTask = false
    for (let allowedTask of allowedTasks) {
      for (let roleTask of roleTasks) {
        if (roleTask.name === allowedTask) {
          hasTask = true
          break
        }
      }
    }
    return hasTask
  },
  canEdit: (component) => {
    if (store.state.auth.role === 'Admin') {
      return true
    }
    let roleTasks = store.state.auth.tasks
    let allowedTasks = []
    for (let componentTask of componentsTasks) {
      if (componentTask.component === component) {
        allowedTasks = componentTask.editTasks
        break
      }
    }
    if (allowedTasks.length === 0) {
      return true
    }
    let hasTask = false
    for (let allowedTask of allowedTasks) {
      for (let roleTask of roleTasks) {
        if (roleTask.name === allowedTask) {
          hasTask = true
          break
        }
      }
    }
    return hasTask
  },
  canDelete: (component) => {
    if (store.state.auth.role === 'Admin') {
      return true
    }
    let roleTasks = store.state.auth.tasks
    let allowedTasks = []
    for (let componentTask of componentsTasks) {
      if (componentTask.component === component) {
        allowedTasks = componentTask.deleteTasks
        break
      }
    }
    if (allowedTasks.length === 0) {
      return true
    }
    let hasTask = false
    for (let allowedTask of allowedTasks) {
      for (let roleTask of roleTasks) {
        if (roleTask.name === allowedTask) {
          hasTask = true
          break
        }
      }
    }
    return hasTask
  },
  canApprove: (component) => {
    if (store.state.auth.role === 'Admin') {
      return true
    }
    let roleTasks = store.state.auth.tasks
    let allowedTasks = []
    for (let componentTask of componentsTasks) {
      if (componentTask.component === component) {
        allowedTasks = componentTask.approveTasks
        break
      }
    }
    if (allowedTasks.length === 0) {
      return true
    }
    let hasTask = false
    for (let allowedTask of allowedTasks) {
      for (let roleTask of roleTasks) {
        if (roleTask.name === allowedTask) {
          hasTask = true
          break
        }
      }
    }
    return hasTask
  },
  canReject: (component) => {
    if (store.state.auth.role === 'Admin') {
      return true
    }
    let roleTasks = store.state.auth.tasks
    let allowedTasks = []
    for (let componentTask of componentsTasks) {
      if (componentTask.component === component) {
        allowedTasks = componentTask.rejectTasks
        break
      }
    }
    if (allowedTasks.length === 0) {
      return true
    }
    let hasTask = false
    for (let allowedTask of allowedTasks) {
      for (let roleTask of roleTasks) {
        if (roleTask.name === allowedTask) {
          hasTask = true
          break
        }
      }
    }
    return hasTask
  }
}

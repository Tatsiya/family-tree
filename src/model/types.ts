type RelationType = 'blood' | 'adopted' | 'foster'

export interface Child {
    id: string
    relationType: RelationType

}

export interface Person {
  id: string
  name: string
  middleName: string
  lastName: string
  maidenName?: string
  dateOfBirth?: string
  dateOfDeath?: string
  placeOfBirth?: string
}

export interface Family {
    id: string
    partners: string[]
    children?: Child[]
    dateOfMarriage?: string
    areDivorced?: boolean
}

export interface Tree {
    rootPersonId: string
    families?: Record<string, Family>
    persons: Record<string, Person>
}
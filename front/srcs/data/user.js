/**
 * @typedef {Object} UserProfile
 *  @property {string} id
 *  @property {boolean} isLoggedIn
 *  @property {{
 *   url: string
 *  }} avatar
 */

const DEFAULT_AVATAR_URL = "https://media.istockphoto.com/id/1251434169/ko/%EC%82%AC%EC%A7%84/%EC%97%B4%EB%8C%80-%EC%9E%8E-%EC%A0%95%EA%B8%80%EC%9D%98-%EC%A7%99%EC%9D%80-%EB%85%B9%EC%83%89-%EB%8B%A8%ED%92%8D-%EC%9E%90%EC%97%B0-%EB%B0%B0%EA%B2%BD.jpg?s=612x612&w=0&k=20&c=-v5nlfyzPmVxWkzUVcZ8-LJ7edlQIpbT6Tf1O-eAXEs=";


export default class User {

  /** @type {UserProfile} */
  profile;

  /** @type {UserProfile[]} */
  friends;

  /** 
   * @params {Object} args
   * @param {{
   *   profile: UserProfile | null,
   *   friends: UserProfile[]
   *  }} args
   */
  constructor({
    profile,
    friends = [],
  }) {
    this.profile = profile || null;
    this.friends = friends;
    if (this.profile) {
      this.profile.isLoggedIn = true;
    }
  }
}

/**
 * createProfile.
 *
 * @params {Object} args
 * @param {{
 *  id: string,
 *  profileUrl?: string,
 *  isLoggedIn?: boolean
 * }} args
 * @returns UserProfile
 */
export function createProfile({id, level, profileUrl, stateMessage, wins, loses, isLoggedIn}) {
  return ({
    id,
    level: level ?? 0,
    stateMessage: stateMessage ?? "",
    wins: wins ?? 0,
    loses: loses ?? 0,
    isLoggedIn: isLoggedIn ?? true,
    avatar: {
      url: profileUrl ?? DEFAULT_AVATAR_URL,
    }
  })
}

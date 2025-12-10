import { FTML } from '@flexiformal/ftml';
import { Comment } from '@alea/spec';
import { organizeHierarchically } from './comment-helpers';

export class CommentStore {
  private storedPublicComments: Comment[] | undefined = undefined;
  private storedPrivateNotes: Comment[] | undefined = undefined;
  constructor(private uri: FTML.Uri) {}

  public setComments(flatComments: Comment[]) {
    this.storedPublicComments = organizeHierarchically(flatComments.filter((c) => !c.isPrivate));
    this.storedPrivateNotes = flatComments.filter((c) => c.isPrivate);
  }

  getPublicCommentTrees(): Comment[] | undefined {
    return this.storedPublicComments;
  }

  getPrivateNotes(): Comment[] | undefined {
    return this.storedPrivateNotes;
  }
}

import { Comment, isHiddenNotSpam, isSpam } from '@stex-react/spec';

export class CommentFilters {

  constructor(
    private onResetNeeded: () => void,
    public showHidden = false,
    public showSpam = false
  ) {
  }

  onShowHidden() {
    this.showHidden = !this.showHidden;
    if (!this.showHidden) {
      this.showSpam = false;
    }
    this.onResetNeeded();
  }

  onShowSpam() {
    this.showSpam = !this.showSpam;
    if (this.showSpam) {
      this.showHidden = true;
    }
    this.onResetNeeded();
  }

  filterHidden(comment: Comment) {
    comment.childComments = comment.childComments?.filter((c) =>
      this.isCommentVisible(c)
    );
    comment.childComments?.forEach((c) => this.filterHidden(c));
  }

  private isCommentVisible(comment: Comment) {
    if (!comment) return false;
    if (!this.showSpam && isSpam(comment.hiddenStatus)) {
      return false;
    }
    if (
      !(this.showHidden || this.showSpam) &&
      isHiddenNotSpam(comment.hiddenStatus)
    ) {
      return false;
    }
    return true;
  }
}

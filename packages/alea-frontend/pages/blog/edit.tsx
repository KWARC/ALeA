import { BlogPost, canAccessResource, getPostById } from '@alea/spec';
import { Action, ResourceName } from '@alea/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { EditPostComponent } from './new';

const EditPostPage: NextPage = () => {
  const router = useRouter();
  const { postId } = router.query;
  const [existingPostInfo, setExistingPostInfo] = useState<BlogPost>(undefined);

  useEffect(() => {
    async function isUserAuthorized() {
      if (!(await canAccessResource(ResourceName.BLOG, Action.MUTATE))) {
        router.push('/blog');
      }
    }
    isUserAuthorized();
  }, []);

  useEffect(() => {
    const fetchBlogPost = async () => {
      const post = await getPostById(postId as string);
      setExistingPostInfo(post);
    };
    if (router.isReady) fetchBlogPost();
  }, [router.isReady, postId]);
  return (
    <MainLayout>
      <EditPostComponent existingPost={existingPostInfo} />
    </MainLayout>
  );
};

export default EditPostPage;

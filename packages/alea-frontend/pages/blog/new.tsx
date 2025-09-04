import { Box, Button, TextField, Typography } from '@mui/material';
import {
  BlogPost,
  canAccessResource,
  CdnImageMetadata,
  createBlogPost,
  getCdnImages,
  updateBlogPost,
  uploadCdnImage,
} from '@stex-react/spec';
import { MystEditor } from '@stex-react/myst';
import { Action, localStore, ResourceName } from '@stex-react/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ImageCard from '../../components/ImageCard';
import MainLayout from '../../layouts/MainLayout';

function generatePostId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9_ ]/g, '')
    .trim()
    .replace(/ /g, '-');
}

const DRAFT_BLOG_TITLE_KEY = 'draft-blogTitle';
const DRAFT_BLOG_BODY_KEY = 'draft-blogBody';

export function EditPostComponent({ existingPost }: { existingPost?: BlogPost }) {
  const router = useRouter();
  const [title, setTitle] = useState(
    existingPost?.title ?? localStore?.getItem(DRAFT_BLOG_TITLE_KEY) ?? ''
  );
  const [body, setBody] = useState(
    existingPost?.body ?? localStore?.getItem(DRAFT_BLOG_BODY_KEY) ?? ''
  );
  const postId = existingPost ? existingPost.postId : generatePostId(title);
  const [imageUploadResponses, setImageUploadResponses] = useState<CdnImageMetadata[] | {}[]>([]);
  const [heroImageUrl, setHeroImageUrl] = useState<string | undefined>(
    existingPost?.heroImageUrl ?? undefined
  );
  const [heroImageId, setHeroImageId] = useState<string | undefined>(
    existingPost?.heroImageId ?? undefined
  );
  const [heroImagePosition, setHeroImagePosition] = useState<string | undefined>(
    existingPost?.heroImagePosition ?? undefined
  );

  const hasChanged =
    title !== existingPost?.title ||
    body !== existingPost?.body ||
    heroImageId !== existingPost?.heroImageId ||
    heroImageUrl !== existingPost?.heroImageUrl ||
    heroImagePosition !== existingPost?.heroImagePosition;

  const handleImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        const base64Image = (reader.result as string).split(',')[1];
        const response: CdnImageMetadata | {} = await uploadCdnImage(base64Image);
        setImageUploadResponses((prev) => [...prev, response]);
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image. Please try again.');
      }
    };
  };

  const loadImages = async () => {
    const data = await getCdnImages();
    setImageUploadResponses(data);
  };

  useEffect(() => {
    loadImages();
  }, []);

  useEffect(() => {
    async function redirectIfNotAuthorized() {
      if (!(await canAccessResource(ResourceName.BLOG, Action.MUTATE))) {
        router.push('/blog');
      }
    }
    redirectIfNotAuthorized();
  }, []);

  const handleSubmit = async () => {
    if (existingPost) {
      await updateBlogPost(title, body, heroImageId, heroImageUrl, heroImagePosition, postId);
    } else {
      await createBlogPost(title, body, postId, heroImageId, heroImageUrl, heroImagePosition);
    }
    setTitle('');
    setBody('');
    localStore.removeItem(DRAFT_BLOG_TITLE_KEY);
    localStore.removeItem(DRAFT_BLOG_BODY_KEY);
    alert('Success!');
    router.push('/blog');
  };

  return (
    <>
      <Box mx="10px">
        <Box width="100%" m="0px 20px">
          <Typography fontSize={24} m="10px 0px">
            {existingPost ? 'Edit Post' : 'Create Post'}
          </Typography>
          {imageUploadResponses.length > 0 && (
            <Box
              sx={{
                padding: '20px',
                margin: '10px 0px',
                marginRight: '30px',
                display: 'flex',
                gap: '10px',
                overflowX: 'auto',
                boxShadow: '0 0 10px  gray',
                borderRadius: '10px',
              }}
            >
              {imageUploadResponses.map((data) => (
                <ImageCard imageId={data.id} imageUrl={data.display_url} key={data.id} />
              ))}
            </Box>
          )}
          <Box m="10px 0px">
            <input type="file" accept="image/*" onChange={handleImagesUpload} />
          </Box>

          <TextField
            label="postId"
            variant="outlined"
            disabled
            value={postId}
            size="small"
            sx={{ mb: '20px' }}
          />
          <TextField
            label="HeroImage Url"
            variant="outlined"
            disabled
            value={heroImageUrl}
            size="small"
            sx={{ mb: '20px' }}
          />
          <Box mb="20px">
            <MystEditor
              value={title}
              onValueChange={(v) => {
                setTitle(v);
                localStore.setItem(DRAFT_BLOG_TITLE_KEY, title);
              }}
              name="title_input"
              placeholder="Title of your blog post"
              defaultPreview={true}
            />
            <Box
              sx={{
                mt: '10px',
                display: 'flex',
                gap: '300px',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', width: '520px' }}>
                <TextField
                  label="HeroImage Id"
                  variant="outlined"
                  size="small"
                  sx={{ mb: '20px', mr: '20px', width: '100%' }}
                  value={heroImageId}
                  onChange={(e) => {
                    const imageId = e.target.value;
                    const img = imageUploadResponses.find((data) => {
                      return data.id === e.target.value;
                    });
                    if (!img) {
                      setHeroImageId('');
                      return;
                    }
                    setHeroImageId(imageId);
                    setHeroImageUrl(img['display_url']);
                  }}
                />
                <TextField
                  value={heroImagePosition}
                  label="Object Position (e.g. 0 25%)"
                  variant="outlined"
                  size="small"
                  onChange={(e) => setHeroImagePosition(e.target.value)}
                  error={!heroImageId}
                  sx={{ width: '100%' }}
                />
              </Box>
              {heroImageId && (
                <Box sx={{ width: '520px', display: 'flex', justifyContent: 'center' }}>
                  <img
                    src={heroImageUrl}
                    style={{
                      height: '200px',
                      width: '100%',
                      objectFit: 'cover',
                      objectPosition: heroImagePosition,
                    }}
                    alt="hero image"
                  />
                </Box>
              )}
            </Box>
          </Box>
          <MystEditor
            value={body}
            onValueChange={(v) => {
              setBody(v);
              localStore.setItem(DRAFT_BLOG_BODY_KEY, body);
            }}
            name="body_input"
            minRows={20}
            placeholder="content of your blog post"
            defaultPreview={true}
          />
          <Button
            sx={{ m: '20px' }}
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={!hasChanged}
          >
            {existingPost ? 'Update Post' : 'Create Post'}
          </Button>
        </Box>
      </Box>
    </>
  );
}
const NewPostPage: NextPage = () => {
  return (
    <MainLayout>
      <EditPostComponent />
    </MainLayout>
  );
};

export default NewPostPage;

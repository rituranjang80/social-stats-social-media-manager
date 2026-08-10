/**
 * @module composer
 * Public composer module — page and composer hook (logic migrates here over time).
 */
export { default as ComposerPage } from '../../pages/composer/ComposerPage';
export {
  useComposerPosts,
  useComposerPost,
  useMediaAssets,
  usePostQueues,
} from '../../hooks/useComposer';

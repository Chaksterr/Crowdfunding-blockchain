import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import CreatePage from './pages/CreatePage';
import HomePage from './pages/HomePage';
import MyContributionsPage from './pages/MyContributionsPage';
import NotFoundPage from './pages/NotFoundPage';
import ProjectPage from './pages/ProjectPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/project/:address" element={<ProjectPage />} />
        <Route path="/my-contributions" element={<MyContributionsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}

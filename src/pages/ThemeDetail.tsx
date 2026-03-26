import { Navigate, useParams } from "react-router-dom";

const ThemeDetail = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  return <Navigate to={`/assets${categoryId ? `?theme=${categoryId}` : ''}`} replace />;
};

export default ThemeDetail;

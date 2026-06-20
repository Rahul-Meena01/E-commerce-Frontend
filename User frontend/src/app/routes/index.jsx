/* eslint-disable react-refresh/only-export-components */
import { lazy } from "react";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "../../shared/components/ui/ProtectedRoute";
import WithLayout from "../../shared/components/layout/WithLayout";

const Home = lazy(() => import("../../pages/shop/Home"));
const ProductDetail = lazy(() => import("../../pages/shop/ProductDetail"));
const CategoryPage = lazy(() => import("../../pages/shop/CategoryPage"));
const SubCategoryPage = lazy(() => import("../../pages/shop/SubCategoryPage"));
const ShopPage = lazy(() => import("../../pages/shop/ShopPage"));
const InfoPage = lazy(() => import("../../pages/info/InfoPage"));

const CheckoutPage = lazy(() => import("../../pages/user/CheckoutPage"));
const OrderSuccessPage = lazy(
  () => import("../../pages/user/OrderSuccessPage"),
);
const ProfilePage = lazy(() => import("../../pages/user/ProfilePage"));
const OrderDetailsPage = lazy(() => import("../../features/orders/pages/OrderDetailsPage"));
const NotFound = lazy(() => import("../../pages/NotFound"));
const LoginPage = lazy(() => import("../../pages/auth/LoginPage"));
const SignupPage = lazy(() => import("../../pages/auth/SignupPage"));

export const routes = [
  {
    path: "/",
    element: (
      <WithLayout>
        <Home />
      </WithLayout>
    ),
  },
  {
    path: "/shop",
    element: (
      <WithLayout>
        <ShopPage />
      </WithLayout>
    ),
  },
  {
    path: "/shop/:category",
    element: (
      <WithLayout>
        <CategoryPage />
      </WithLayout>
    ),
  },
  {
    path: "/shop/:category/:subCategory",
    element: (
      <WithLayout>
        <SubCategoryPage />
      </WithLayout>
    ),
  },
  {
    path: "/product/:productId",
    element: (
      <WithLayout>
        <ProductDetail />
      </WithLayout>
    ),
  },

  {
    path: "/checkout",
    element: (
      <ProtectedRoute>
        <WithLayout>
          <CheckoutPage />
        </WithLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/order-success/:orderId",
    element: (
      <WithLayout>
        <OrderSuccessPage />
      </WithLayout>
    ),
  },
  {
    path: "/login",
    element: (
      <WithLayout>
        <LoginPage />
      </WithLayout>
    ),
  },
  {
    path: "/signup",
    element: (
      <WithLayout>
        <SignupPage />
      </WithLayout>
    ),
  },
  {
    path: "/forgot",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <WithLayout>
          <ProfilePage />
        </WithLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/orders/:orderId",
    element: (
      <ProtectedRoute>
        <WithLayout>
          <OrderDetailsPage />
        </WithLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/info/:pageSlug",
    element: (
      <WithLayout>
        <InfoPage />
      </WithLayout>
    ),
  },
  {
    path: "/about",
    element: (
      <WithLayout>
        <InfoPage />
      </WithLayout>
    ),
  },
  {
    path: "/contact",
    element: (
      <WithLayout>
        <InfoPage />
      </WithLayout>
    ),
  },
  {
    path: "/faq",
    element: (
      <WithLayout>
        <InfoPage />
      </WithLayout>
    ),
  },
  {
    path: "/privacy",
    element: (
      <WithLayout>
        <InfoPage />
      </WithLayout>
    ),
  },
  {
    path: "/terms",
    element: (
      <WithLayout>
        <InfoPage />
      </WithLayout>
    ),
  },
  {
    path: "/shipping-policy",
    element: (
      <WithLayout>
        <InfoPage />
      </WithLayout>
    ),
  },
  {
    path: "/return-policy",
    element: (
      <WithLayout>
        <InfoPage />
      </WithLayout>
    ),
  },
  {
    path: "/careers",
    element: (
      <WithLayout>
        <InfoPage />
      </WithLayout>
    ),
  },
  {
    path: "/help",
    element: (
      <WithLayout>
        <InfoPage />
      </WithLayout>
    ),
  },
  {
    path: "*",
    element: (
      <WithLayout>
        <NotFound />
      </WithLayout>
    ),
  },
];

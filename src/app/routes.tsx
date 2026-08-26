import { Route, Routes } from 'react-router-dom'
import { AlbumPage } from '../pages/AlbumPage'
import { AdminPage } from '../pages/AdminPage'
import { AboutPage } from '../pages/AboutPage'
import { ContributePage } from '../pages/ContributePage'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
export function AppRoutes() { return <Routes><Route path="/" element={<HomePage />} /><Route path="/about" element={<AboutPage />} /><Route path="/contribute" element={<ContributePage />} /><Route path="/album" element={<AlbumPage />} /><Route path="/admin" element={<AdminPage />} /><Route path="*" element={<NotFoundPage />} /></Routes> }

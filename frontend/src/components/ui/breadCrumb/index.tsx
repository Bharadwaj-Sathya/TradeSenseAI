import React from "react";
import { Link } from "react-router-dom";

interface BreadCrumbProps {
  pageName: string;
  menuName?: string;
}

const BreadCrumb: React.FC<BreadCrumbProps> = ({ pageName, menuName }) => {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
      {/* Page Name */}
      <div className="text-sm font-semibold text-black uppercase">
        {pageName}
      </div>

      {/* Breadcrumb */}
      {menuName && (
        <nav aria-label="breadcrumb">
          <ol className="flex items-center gap-1 text-sm text-gray-600">
            <li>
              <Link to="/" className="text-gray-700 hover:underline">
                {menuName}
              </Link>
            </li>
            <li>
              <span className="mx-1">/</span>
            </li>
            <li className="text-gray-500">{pageName}</li>
          </ol>
        </nav>
      )}
    </div>
  );
};

export default BreadCrumb;
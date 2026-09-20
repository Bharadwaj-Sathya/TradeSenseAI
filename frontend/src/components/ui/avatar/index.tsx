import React from 'react';

// Avatar Component
interface AvatarProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ children, style, className }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-full overflow-hidden ${className}`}
        style={{ display: 'inline-block', position: 'relative', ...style }}
      >
        {children}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

// AvatarImage Component
interface AvatarImageProps {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  className?: string;
}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ src, alt, style, className }, ref) => {
    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={`object-cover w-full h-full ${className}`}
        style={style}
      />
    );
  }
);

AvatarImage.displayName = 'AvatarImage';

// AvatarFallback Component
interface AvatarFallbackProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ children, style, className }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-center justify-center bg-gray-300 text-white font-bold ${className}`}
        style={{
          width: '100%',
          height: '100%',
          fontSize: '1.25rem',
          ...style,
        }}
      >
        {children}
      </div>
    );
  }
);

AvatarFallback.displayName = 'AvatarFallback';

// AvatarComponent - the main component
interface AvatarComponentProps {
  name: string;
  imageUrl?: string;
  size?: number;
  className?: string;
}

const AvatarComponent = React.forwardRef<HTMLDivElement, AvatarComponentProps>(
  ({ name, imageUrl, size = 50, className }, ref) => {
    // Generate initials from the name
    const getInitials = (name: string) => {
      const parts = name.split(' ');
      return parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name[0].toUpperCase();
    };

    return (
      <Avatar ref={ref} className={className} style={{ width: size, height: size }}>
        {imageUrl ? (
          <AvatarImage src={imageUrl} alt={name} />
        ) : (
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        )}
      </Avatar>
    );
  }
);

AvatarComponent.displayName = 'AvatarComponent';

export { AvatarComponent, Avatar, AvatarImage, AvatarFallback };
